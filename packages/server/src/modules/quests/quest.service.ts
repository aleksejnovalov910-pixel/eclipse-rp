import { sql } from 'kysely';
import type { QuestView } from '@eclipse/shared';
import { createLogger } from '../../core/logger';
import { db } from '../../infra/db';

const log = createLogger('quest');

export const listQuests = async (characterId: number): Promise<QuestView[]> => {
  const [definitions, progress] = await Promise.all([
    db().selectFrom('quest_definitions').selectAll().where('enabled', '=', true).orderBy('sort_order').execute(),
    db().selectFrom('quest_progress').selectAll().where('character_id', '=', characterId).execute(),
  ]);
  const byKey = new Map(progress.map((p) => [p.quest_key, p]));
  return definitions.map((q) => {
    const p = byKey.get(q.key);
    return {
      key: q.key,
      title: q.title,
      description: q.description,
      target: q.target,
      progress: Math.min(p?.progress ?? 0, q.target),
      completed: p?.completed_at != null,
      claimed: p?.claimed_at != null,
      rewardCash: q.reward_cash,
      rewardBank: q.reward_bank,
    };
  });
};

export const advanceQuest = async (characterId: number, questKey: string, amount = 1): Promise<void> => {
  if (!Number.isInteger(amount) || amount <= 0) return;
  await db().transaction().execute(async (trx) => {
    const definition = await trx
      .selectFrom('quest_definitions')
      .select(['target', 'enabled'])
      .where('key', '=', questKey)
      .executeTakeFirst();
    if (!definition?.enabled) return;

    const current = await trx
      .selectFrom('quest_progress')
      .select(['progress', 'completed_at'])
      .where('character_id', '=', characterId)
      .where('quest_key', '=', questKey)
      .forUpdate()
      .executeTakeFirst();
    if (current?.completed_at) return;

    const progress = Math.min(definition.target, (current?.progress ?? 0) + amount);
    const completedAt = progress >= definition.target ? new Date() : null;
    await trx
      .insertInto('quest_progress')
      .values({ character_id: characterId, quest_key: questKey, progress, completed_at: completedAt, updated_at: new Date() })
      .onConflict((oc) =>
        oc.columns(['character_id', 'quest_key']).doUpdateSet({ progress, completed_at: completedAt, updated_at: new Date() }),
      )
      .execute();
  });
};

/**
 * Побочный прогресс задания не должен ломать основное игровое действие.
 * Например, успешное банковское внесение денег уже зафиксировано транзакцией;
 * сбой подсистемы заданий не должен превращать его в ошибку для игрока.
 */
export const advanceQuestSafe = async (characterId: number, questKey: string, amount = 1): Promise<void> => {
  try {
    await advanceQuest(characterId, questKey, amount);
  } catch (error) {
    log.error(`не удалось обновить задание ${questKey} для character=${characterId}`, error);
  }
};

export const claimQuest = async (characterId: number, questKey: string): Promise<QuestView> =>
  db().transaction().execute(async (trx) => {
    const definition = await trx
      .selectFrom('quest_definitions')
      .selectAll()
      .where('key', '=', questKey)
      .where('enabled', '=', true)
      .executeTakeFirst();
    if (!definition) throw new Error('QUEST_NOT_FOUND');

    const progress = await trx
      .selectFrom('quest_progress')
      .selectAll()
      .where('character_id', '=', characterId)
      .where('quest_key', '=', questKey)
      .forUpdate()
      .executeTakeFirst();
    if (!progress || !progress.completed_at) throw new Error('QUEST_NOT_COMPLETED');
    if (progress.claimed_at) throw new Error('QUEST_ALREADY_CLAIMED');

    const claimedAt = new Date();
    await trx
      .updateTable('quest_progress')
      .set({ claimed_at: claimedAt, updated_at: claimedAt })
      .where('character_id', '=', characterId)
      .where('quest_key', '=', questKey)
      .execute();

    await trx
      .updateTable('characters')
      .set({
        cash: sql<string>`cash + ${definition.reward_cash}::numeric`,
        bank: sql<string>`bank + ${definition.reward_bank}::numeric`,
        updated_at: new Date(),
      })
      .where('id', '=', characterId)
      .executeTakeFirstOrThrow();

    if (Number(definition.reward_cash) > 0) {
      await trx
        .insertInto('economy_ledger')
        .values({
          character_id: characterId,
          family_id: null,
          source: `quest:${questKey}:cash`,
          direction: 'source',
          amount: definition.reward_cash,
          metadata: { questKey },
        })
        .execute();
    }
    if (Number(definition.reward_bank) > 0) {
      await trx
        .insertInto('economy_ledger')
        .values({
          character_id: characterId,
          family_id: null,
          source: `quest:${questKey}:bank`,
          direction: 'source',
          amount: definition.reward_bank,
          metadata: { questKey },
        })
        .execute();
    }

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      target: definition.target,
      progress: progress.progress,
      completed: true,
      claimed: true,
      rewardCash: definition.reward_cash,
      rewardBank: definition.reward_bank,
    };
  });
