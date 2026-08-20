import {
  ErrorCode,
  RpcEvent,
  SessionState,
  err,
  ok,
  type FamilyCreateRequest,
  type FamilyInvitationView,
  type FamilyInviteRequest,
  type FamilyMemberView,
  type FamilyTreasuryRequest,
  type FamilyView,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './family.service';
import { advanceQuestSafe } from '../quests/quest.service';

const requireCharacter = (state: SessionState, characterId: number | null): number | null =>
  state === SessionState.Playing && characterId !== null ? characterId : null;

const mapError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'INVALID_FAMILY_NAME': return err(ErrorCode.Validation, { reason: 'invalid_family_name' });
    case 'INVALID_TARGET': return err(ErrorCode.Validation, { reason: 'invalid_target' });
    case 'INVALID_AMOUNT': return err(ErrorCode.InvalidAmount);
    case 'ALREADY_IN_FAMILY': return err(ErrorCode.AlreadyInFamily);
    case 'TARGET_IN_FAMILY': return err(ErrorCode.AlreadyInFamily, { reason: 'target_in_family' });
    case 'FAMILY_NAME_TAKEN': return err(ErrorCode.FamilyNameTaken);
    case 'CHARACTER_NOT_FOUND': return err(ErrorCode.CharacterNotFound);
    case 'NOT_IN_FAMILY': return err(ErrorCode.Validation, { reason: 'not_in_family' });
    case 'NO_PERMISSION': return err(ErrorCode.Unauthorized, { reason: 'family_permission' });
    case 'INVITE_NOT_FOUND': return err(ErrorCode.Validation, { reason: 'invite_not_found' });
    case 'OWNER_CANNOT_LEAVE': return err(ErrorCode.Validation, { reason: 'owner_cannot_leave' });
    case 'INSUFFICIENT_FUNDS': return err(ErrorCode.InsufficientFunds);
    case 'INSUFFICIENT_FAMILY_FUNDS': return err(ErrorCode.InsufficientFunds, { reason: 'family_treasury' });
    case 'FAMILY_NOT_FOUND': return err(ErrorCode.Validation, { reason: 'family_not_found' });
    default: throw error;
  }
};

export const registerFamilyModule = (): void => {
  const readRule = { max: 40, windowMs: 60_000 };
  const writeRule = { max: 15, windowMs: 60_000 };

  onRpc<unknown, FamilyView | null>(RpcEvent.FamilyGet, async (ctx) => {
    const limited = consume(ctx.session, 'family:get', readRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await service.getFamily(id));
  });

  onRpc<FamilyCreateRequest, FamilyView>(RpcEvent.FamilyCreate, async (ctx, payload) => {
    const limited = consume(ctx.session, 'family:create', { max: 3, windowMs: 60 * 60_000 }); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (!payload || typeof payload.name !== 'string') return err(ErrorCode.Validation);
    try {
      const family = await service.createFamily(id, payload.name);
      await advanceQuestSafe(id, 'join_family');
      return ok(family);
    } catch (error) { return mapError(error); }
  });

  onRpc<unknown, FamilyMemberView[]>(RpcEvent.FamilyMembers, async (ctx) => {
    const limited = consume(ctx.session, 'family:members', readRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    try { return ok(await service.listMembers(id)); } catch (error) { return mapError(error); }
  });

  onRpc<FamilyInviteRequest, FamilyInvitationView>(RpcEvent.FamilyInvite, async (ctx, payload) => {
    const limited = consume(ctx.session, 'family:invite', writeRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (!Number.isInteger(payload?.targetCharacterId)) return err(ErrorCode.Validation, { field: 'targetCharacterId' });
    try { return ok(await service.inviteMember(id, payload.targetCharacterId)); } catch (error) { return mapError(error); }
  });

  onRpc<unknown, FamilyInvitationView | null>(RpcEvent.FamilyInvitation, async (ctx) => {
    const limited = consume(ctx.session, 'family:invitation', readRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(service.getInvitation(id));
  });

  onRpc<unknown, FamilyView>(RpcEvent.FamilyAcceptInvite, async (ctx) => {
    const limited = consume(ctx.session, 'family:acceptInvite', writeRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    try {
      const family = await service.acceptInvitation(id);
      await advanceQuestSafe(id, 'join_family');
      return ok(family);
    } catch (error) { return mapError(error); }
  });

  onRpc<unknown, { left: true }>(RpcEvent.FamilyLeave, async (ctx) => {
    const limited = consume(ctx.session, 'family:leave', writeRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    try { await service.leaveFamily(id); return ok({ left: true as const }); } catch (error) { return mapError(error); }
  });

  onRpc<FamilyTreasuryRequest, FamilyView>(RpcEvent.FamilyTreasuryDeposit, async (ctx, payload) => {
    const limited = consume(ctx.session, 'family:treasuryDeposit', writeRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (typeof payload?.amount !== 'string') return err(ErrorCode.Validation, { field: 'amount' });
    try { return ok(await service.treasuryDeposit(id, payload.amount)); } catch (error) { return mapError(error); }
  });

  onRpc<FamilyTreasuryRequest, FamilyView>(RpcEvent.FamilyTreasuryWithdraw, async (ctx, payload) => {
    const limited = consume(ctx.session, 'family:treasuryWithdraw', writeRule); if (limited) return limited;
    const id = requireCharacter(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (typeof payload?.amount !== 'string') return err(ErrorCode.Validation, { field: 'amount' });
    try { return ok(await service.treasuryWithdraw(id, payload.amount)); } catch (error) { return mapError(error); }
  });
};
