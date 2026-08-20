import { sql, type Transaction } from 'kysely';
import type { JobAssignmentView, JobProgressView, JobStepResult, JobTarget } from '@eclipse/shared';
import { db } from '../../infra/db';
import type { Database } from '../../infra/schema';
import { advanceQuestSafe } from '../quests/quest.service';

interface JobDefinition {
  name: string;
  rewardCash: string;
  experienceReward: number;
  targets: readonly JobTarget[];
}

const JOBS: Record<string, JobDefinition> = {
  builder: {
    name: 'Строитель', rewardCash: '650.00', experienceReward: 35,
    targets: [{ x: -508.7, y: -1001.7, z: 23.6 }, { x: -493.4, y: -1015.4, z: 23.5 }, { x: -477.8, y: -995.0, z: 23.6 }],
  },
  collector: {
    name: 'Собиратель', rewardCash: '520.00', experienceReward: 30,
    targets: [{ x: 247.1, y: -835.9, z: 29.3 }, { x: 182.7, y: -914.1, z: 30.7 }, { x: 119.4, y: -1037.6, z: 29.3 }],
  },
  courier: {
    name: 'Почтальон', rewardCash: '700.00', experienceReward: 40,
    targets: [{ x: -54.8, y: -1754.5, z: 29.4 }, { x: 255.4, y: -375.7, z: 44.1 }, { x: -296.8, y: -829.8, z: 32.4 }],
  },
  detective: {
    name: 'Сыщик', rewardCash: '850.00', experienceReward: 45,
    targets: [{ x: 441.2, y: -981.9, z: 30.7 }, { x: 304.8, y: -600.2, z: 43.3 }, { x: -1095.0, y: -836.4, z: 19.0 }],
  },
  firefighter: {
    name: 'Пожарный', rewardCash: '900.00', experienceReward: 45,
    targets: [{ x: 1201.3, y: -1471.2, z: 34.9 }, { x: 215.0, y: -1642.7, z: 29.8 }, { x: -633.5, y: -121.6, z: 39.0 }],
  },
  cash_collector: {
    name: 'Инкассатор', rewardCash: '1100.00', experienceReward: 55,
    targets: [{ x: 149.8, y: -1040.6, z: 29.4 }, { x: -1212.9, y: -330.8, z: 37.8 }, { x: -2962.6, y: 482.9, z: 15.7 }],
  },
  trucker: {
    name: 'Дальнобойщик', rewardCash: '1450.00', experienceReward: 65,
    targets: [{ x: 1204.6, y: -3104.2, z: 5.9 }, { x: 2568.2, y: 468.7, z: 108.5 }, { x: 1704.8, y: 4917.5, z: 42.1 }],
  },
  treasure_hunter: {
    name: 'Кладоискатель', rewardCash: '1250.00', experienceReward: 60,
    targets: [{ x: -1604.1, y: 5256.8, z: 3.9 }, { x: 501.1, y: 5604.2, z: 797.9 }, { x: 3327.7, y: 5151.2, z: 18.3 }],
  },
};

interface ActiveAssignment {
  jobKey: string;
  stepIndex: number;
  issuedAt: number;
}

const active = new Map<number, ActiveAssignment>();
const TARGET_RADIUS = 8;
const MIN_STEP_TIME_MS = 1_500;

const nextLevelExperience = (level: number): number => 100 + Math.max(0, level - 1) * 75;

const definition = (jobKey: string): JobDefinition => {
  const job = JOBS[jobKey];
  if (!job) throw new Error('UNKNOWN_JOB');
  return job;
};

const toAssignmentView = (assignment: ActiveAssignment): JobAssignmentView => {
  const job = definition(assignment.jobKey);
  const target = job.targets[assignment.stepIndex];
  if (!target) throw new Error('INVALID_JOB_STEP');
  return {
    jobKey: assignment.jobKey,
    name: job.name,
    step: assignment.stepIndex + 1,
    totalSteps: job.targets.length,
    target,
    rewardCash: job.rewardCash,
    experienceReward: job.experienceReward,
  };
};

export const listProgress = async (characterId: number): Promise<JobProgressView[]> => {
  const rows = await db()
    .selectFrom('job_progress')
    .select(['job_key', 'level', 'experience', 'completed'])
    .where('character_id', '=', characterId)
    .execute();

  const byKey = new Map(rows.map((row) => [row.job_key, row]));
  return Object.entries(JOBS).map(([jobKey, job]) => {
    const row = byKey.get(jobKey);
    const level = row?.level ?? 1;
    return {
      jobKey,
      name: job.name,
      level,
      experience: row?.experience ?? 0,
      completed: row?.completed ?? 0,
      nextLevelExperience: nextLevelExperience(level),
    };
  });
};

export const getActiveAssignment = (characterId: number): JobAssignmentView | null => {
  const assignment = active.get(characterId);
  return assignment ? toAssignmentView(assignment) : null;
};

export const startAssignment = (characterId: number, jobKey: string): JobAssignmentView => {
  definition(jobKey);
  if (active.has(characterId)) throw new Error('JOB_ALREADY_ACTIVE');
  const assignment: ActiveAssignment = { jobKey, stepIndex: 0, issuedAt: Date.now() };
  active.set(characterId, assignment);
  return toAssignmentView(assignment);
};

export const cancelAssignment = (characterId: number): boolean => active.delete(characterId);

const distance = (a: JobTarget, b: JobTarget): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const completeAssignmentStep = async (characterId: number, position: JobTarget): Promise<JobStepResult> => {
  const assignment = active.get(characterId);
  if (!assignment) throw new Error('JOB_NOT_ACTIVE');

  const job = definition(assignment.jobKey);
  const target = job.targets[assignment.stepIndex];
  if (!target) throw new Error('INVALID_JOB_STEP');
  if (distance(position, target) > TARGET_RADIUS) throw new Error('JOB_TOO_FAR');
  if (Date.now() - assignment.issuedAt < MIN_STEP_TIME_MS) throw new Error('JOB_TOO_FAST');

  if (assignment.stepIndex + 1 < job.targets.length) {
    assignment.stepIndex += 1;
    assignment.issuedAt = Date.now();
    return { completed: false, assignment: toAssignmentView(assignment), payoutCash: '0.00', progress: null };
  }

  const progress = await db().transaction().execute(async (trx) => {
    const updatedProgress = await persistCompletion(trx, characterId, assignment.jobKey, job.experienceReward);
    await trx
      .updateTable('characters')
      .set({ cash: sql<string>`cash + ${job.rewardCash}::numeric`, updated_at: new Date() })
      .where('id', '=', characterId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('economy_ledger')
      .values({
        character_id: characterId,
        family_id: null,
        source: `job:${assignment.jobKey}`,
        direction: 'source',
        amount: job.rewardCash,
        metadata: { jobKey: assignment.jobKey },
      })
      .execute();
    return updatedProgress;
  });

  active.delete(characterId);
  await advanceQuestSafe(characterId, 'first_job');
  return { completed: true, assignment: null, payoutCash: job.rewardCash, progress };
};

const persistCompletion = async (
  trx: Transaction<Database>,
  characterId: number,
  jobKey: string,
  experienceGain: number,
): Promise<JobProgressView> => {
  const job = definition(jobKey);
  if (!Number.isInteger(experienceGain) || experienceGain <= 0 || experienceGain > 10_000) {
    throw new Error('INVALID_JOB_EXPERIENCE');
  }

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
    name: job.name,
    level,
    experience,
    completed,
    nextLevelExperience: threshold,
  };
};

export const recordCompletion = async (
  characterId: number,
  jobKey: string,
  experienceGain: number,
): Promise<JobProgressView> => {
  const result = await db().transaction().execute((trx) => persistCompletion(trx, characterId, jobKey, experienceGain));
  await advanceQuestSafe(characterId, 'first_job');
  return result;
};
