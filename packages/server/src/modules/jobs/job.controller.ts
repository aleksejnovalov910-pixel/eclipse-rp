import { ErrorCode, RpcEvent, SessionState, err, ok, type JobProgressView } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import { listProgress } from './job.service';

export const registerJobModule = (): void => {
  const rule = { max: 30, windowMs: 60_000 };

  onRpc<unknown, JobProgressView[]>(RpcEvent.JobProgress, async (ctx) => {
    const limited = consume(ctx.session, 'jobs:progress', rule);
    if (limited) return limited;
    if (ctx.session.state !== SessionState.Playing || ctx.session.characterId === null) {
      return err(ErrorCode.Unauthorized);
    }
    return ok(await listProgress(ctx.session.characterId));
  });
};
