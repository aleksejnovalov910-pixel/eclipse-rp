import {
  ErrorCode,
  RpcEvent,
  SessionState,
  err,
  ok,
  type FamilyCreateRequest,
  type FamilyView,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './family.service';
import { advanceQuestSafe } from '../quests/quest.service';

const mapError = (error: unknown): ErrorCode => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'INVALID_FAMILY_NAME': return ErrorCode.Validation;
    case 'ALREADY_IN_FAMILY': return ErrorCode.AlreadyInFamily;
    case 'FAMILY_NAME_TAKEN': return ErrorCode.FamilyNameTaken;
    default: return ErrorCode.Internal;
  }
};

export const registerFamilyModule = (): void => {
  onRpc<unknown, FamilyView | null>(RpcEvent.FamilyGet, async (ctx) => {
    const limited = consume(ctx.session, 'family:get', { max: 30, windowMs: 60_000 });
    if (limited) return limited;
    if (ctx.session.state !== SessionState.Playing || ctx.session.characterId === null) {
      return err(ErrorCode.Unauthorized);
    }
    return ok(await service.getFamily(ctx.session.characterId));
  });

  onRpc<FamilyCreateRequest, FamilyView>(RpcEvent.FamilyCreate, async (ctx, payload) => {
    const limited = consume(ctx.session, 'family:create', { max: 3, windowMs: 60 * 60_000 });
    if (limited) return limited;
    if (ctx.session.state !== SessionState.Playing || ctx.session.characterId === null) {
      return err(ErrorCode.Unauthorized);
    }
    if (!payload || typeof payload.name !== 'string') return err(ErrorCode.Validation);
    try {
      const family = await service.createFamily(ctx.session.characterId, payload.name);
      await advanceQuestSafe(ctx.session.characterId, 'join_family');
      return ok(family);
    } catch (error) {
      return err(mapError(error));
    }
  });
};
