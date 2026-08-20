import type { FamilyView } from '@eclipse/shared';
import { db } from '../../infra/db';

const NAME_RE = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 _-]{2,38}[A-Za-zА-Яа-яЁё0-9]$/u;

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export const getFamily = async (characterId: number): Promise<FamilyView | null> => {
  const row = await db()
    .selectFrom('family_members as fm')
    .innerJoin('families as f', 'f.id', 'fm.family_id')
    .innerJoin('family_ranks as fr', 'fr.id', 'fm.rank_id')
    .select(['f.id', 'f.name', 'f.balance', 'f.reputation', 'f.level', 'fr.name as rank_name'])
    .where('fm.character_id', '=', characterId)
    .executeTakeFirst();
  if (!row) return null;

  const count = await db()
    .selectFrom('family_members')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('family_id', '=', row.id)
    .executeTakeFirstOrThrow();

  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    reputation: row.reputation,
    level: row.level,
    rankName: row.rank_name,
    memberCount: Number(count.count),
  };
};

export const createFamily = async (characterId: number, rawName: string): Promise<FamilyView> => {
  const name = normalizeName(rawName);
  if (!NAME_RE.test(name)) throw new Error('INVALID_FAMILY_NAME');
  const nameLower = name.toLocaleLowerCase('ru-RU');

  await db().transaction().execute(async (trx) => {
    const existingMembership = await trx
      .selectFrom('family_members')
      .select('family_id')
      .where('character_id', '=', characterId)
      .forUpdate()
      .executeTakeFirst();
    if (existingMembership) throw new Error('ALREADY_IN_FAMILY');

    const created = await trx
      .insertInto('families')
      .values({ name, name_lower: nameLower, owner_character_id: characterId })
      .returning('id')
      .executeTakeFirst();
    if (!created) throw new Error('FAMILY_CREATE_FAILED');

    const ranks = await trx
      .insertInto('family_ranks')
      .values([
        { family_id: created.id, rank_index: 0, name: 'Новичок', permissions: {} },
        { family_id: created.id, rank_index: 1, name: 'Участник', permissions: { storage: true } },
        { family_id: created.id, rank_index: 2, name: 'Заместитель', permissions: { storage: true, invite: true, contracts: true } },
        { family_id: created.id, rank_index: 3, name: 'Глава', permissions: { all: true } },
      ])
      .returning(['id', 'rank_index'])
      .execute();

    const ownerRank = ranks.find((rank) => rank.rank_index === 3);
    if (!ownerRank) throw new Error('FAMILY_CREATE_FAILED');

    await trx
      .insertInto('family_members')
      .values({ family_id: created.id, character_id: characterId, rank_id: ownerRank.id })
      .execute();
  }).catch((error: unknown) => {
    const pgCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (pgCode === '23505') throw new Error('FAMILY_NAME_TAKEN');
    throw error;
  });

  const family = await getFamily(characterId);
  if (!family) throw new Error('FAMILY_CREATE_FAILED');
  return family;
};
