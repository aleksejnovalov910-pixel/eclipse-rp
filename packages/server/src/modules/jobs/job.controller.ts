import {
  ErrorCode,
  RpcEvent,
  ServerEvent,
  SessionState,
  err,
  ok,
  type JobAssignmentView,
  type JobProgressView,
  type JobStepResult,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import {
  cancelAssignment,
  completeAssignmentStep,
  getActiveAssignment,
  listProgress,
  startAssignment,
} from './job.service';

const requireCharacter = (state: SessionState, characterId: number | null): number | null =>
  state === SessionState.Playing && characterId !== null ? characterId : null;

const mapJobError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'UNKNOWN_JOB': return err(ErrorCode.Validation, { reason: 'unknown_job' });
    case 'JOB_ALREADY_ACTIVE': return err(ErrorCode.Validation, { reason: 'job_already_active' });
    case 'JOB_NOT_ACTIVE': return err(ErrorCode.Validation, { reason: 'job_not_active' });
    case 'JOB_TOO_FAR': return err(ErrorCode.Validation, { reason: 'job_too_far' });
    case 'JOB_TOO_FAST': return err(ErrorCode.Validation, { reason: 'job_too_fast' });
    default: throw error;
  }
};

const syncTarget = (player: PlayerMp, assignment: JobAssignmentView | null): void => {
  player.call(ServerEvent.JobTarget, [JSON.stringify(assignment?.target ?? null)]);
};

export const registerJobModule = (): void => {
  const readRule = { max: 30, windowMs: 60_000 };
  const actionRule = { max: 20, windowMs: 60_000 };

  onRpc<unknown, JobProgressView[]>(RpcEvent.JobProgress, async (ctx) => {
    const limited = consume(ctx.session, 'jobs:progress', readRule);
    if (limited) return limited;
    const characterId = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (characterId === null) return err(ErrorCode.Unauthorized);
    return ok(await listProgress(characterId));
  });

  onRpc<unknown, JobAssignmentView | null>(RpcEvent.JobActive, async (ctx) => {
    const limited = consume(ctx.session, 'jobs:active', readRule);
    if (limited) return limited;
    const characterId = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (characterId === null) return err(ErrorCode.Unauthorized);
    const assignment = getActiveAssignment(characterId);
    syncTarget(ctx.player, assignment);
    return ok(assignment);
  });

  onRpc<{ jobKey?: string }, JobAssignmentView>(RpcEvent.JobStart, async (ctx, payload) => {
    const limited = consume(ctx.session, 'jobs:start', actionRule);
    if (limited) return limited;
    const characterId = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (characterId === null) return err(ErrorCode.Unauthorized);
    if (typeof payload?.jobKey !== 'string') return err(ErrorCode.Validation, { field: 'jobKey' });
    try {
      const assignment = startAssignment(characterId, payload.jobKey);
      syncTarget(ctx.player, assignment);
      return ok(assignment);
    } catch (error) {
      return mapJobError(error);
    }
  });

  onRpc<unknown, JobStepResult>(RpcEvent.JobCompleteStep, async (ctx) => {
    const limited = consume(ctx.session, 'jobs:completeStep', actionRule);
    if (limited) return limited;
    const characterId = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (characterId === null) return err(ErrorCode.Unauthorized);
    try {
      const position = ctx.player.position;
      const result = await completeAssignmentStep(characterId, { x: position.x, y: position.y, z: position.z });
      syncTarget(ctx.player, result.assignment);
      return ok(result);
    } catch (error) {
      return mapJobError(error);
    }
  });

  onRpc<unknown, { cancelled: boolean }>(RpcEvent.JobCancel, async (ctx) => {
    const limited = consume(ctx.session, 'jobs:cancel', actionRule);
    if (limited) return limited;
    const characterId = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (characterId === null) return err(ErrorCode.Unauthorized);
    const cancelled = cancelAssignment(characterId);
    syncTarget(ctx.player, null);
    return ok({ cancelled });
  });
};
