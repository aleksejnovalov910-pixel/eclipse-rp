import type { JobProgressView } from '@eclipse/shared';
import { db } from '../../infra/db';
import { advanceQuestSafe } from '../quests/quest.service';

const JOBS: Record<string, string> = {
  builder: 'Строитель',
  collector: 'Собиратель',
  courier: 'Почтальон',
  detective: 'Сыщик',
  firefighter: 'Пожарный',
  cash_collector: 'Инкассатор',
  trucker: 'Дальнобойщик',
  treasure_hunter: 'Кладоискатель',
};

const nextLevelExperience = (level: number): number => 100 + Math.max(0, level - 1) * 75;

export const listProgress = async (characterId: number): Promise<JobProgressView[]> => {
  const rows = await db()
    .selectFrom('job_progress')
    .select(['job_key', 'level', 'experience', 'completed'])
    .where('character_id', '=', characterId)
    .execute();

  const byKey = new Map(rows.map((row) => [row.job_key, row]));
  return Object.entries(JOBS).map(([jobKey, name]) => {
    const row = byKey.get(jobKey);
    const level = row?.level ?? 1;
    return {
      jobKey,
      name,
      level,
      experience: row?.experience ?? 0,
      completed: row?.completed ?? 0,
      nextLevelExperience: nextLevelExperience(level),
    };
  });
};

export const recordCompletion = async (
  characterId: number,
  jobKey: string,
  experienceGain: number,
): Promise<JobProgressView> => {
  const jobName = JOBS[jobKey];
  if (!jobName) throw new Error('UNKNOWN_JOB');
  if (!Number.isInteger(experienceGain) || experienceGain <= 0 || experienceGain > 10_000) {
    throw new Error('INVALID_JOB_EXPERIENCE');
  }

  const result = await db().transaction().execute(async (trx) => {
    const current = await trx
      .selectFrom('job_progress')
      .select(['level', 'experience', 'completed'])
      .where('character_id', '=', characterId)
      .where('job_key', '=', jobKey)
      .forUpdate()
      .executeTakeFirst();

    let level = current?.level ?? 1;
    let experience = (current?.experience ?? 0) + experienceGain;
    let threshold = nextLevelExperience(level);

    while (experience >= threshold) {
      experience -= threshold;
      level += 1;
      threshold = nextLevelExperience(level);
    }

    const completed = (current?.completed ?? 0) + 1;

    await trx
      .insertInto('job_progress')
      .values({ character_id: characterId, job_key: jobKey, level, experience, completed, updated_at: new Date() })
      .onConflict((oc) => oc.columns(['character_id', 'job_key']).doUpdateSet({
        level,
        experience,
        completed,
        updated_at: new Date(),
      }))
      .execute();

    return {
      jobKey,
      name: jobName,
      level,
      experience,
      completed,
      nextLevelExperience: threshold,
    } satisfies JobProgressView;
  });

  await advanceQuestSafe(characterId, 'first_job');
  return result;
};
