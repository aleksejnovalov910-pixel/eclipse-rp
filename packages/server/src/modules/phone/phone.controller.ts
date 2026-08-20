import {
  ErrorCode,
  RpcEvent,
  SessionState,
  err,
  ok,
  type PhoneContactSaveRequest,
  type PhoneContactView,
  type PhoneMessageView,
  type PhoneProfileView,
  type PhoneSendMessageRequest,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './phone.service';
import { advanceQuestSafe } from '../quests/quest.service';

const characterId = (state: SessionState, id: number | null): number | null =>
  state === SessionState.Playing && id !== null ? id : null;

const mapError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'PHONE_NOT_FOUND') return ErrorCode.PhoneNumberNotFound;
  if (code === 'PHONE_SELF_MESSAGE') return ErrorCode.PhoneSelfMessage;
  if (code === 'CHARACTER_NOT_FOUND') return ErrorCode.CharacterNotFound;
  if (code.startsWith('INVALID_')) return ErrorCode.Validation;
  return ErrorCode.Internal;
};

export const registerPhoneModule = (): void => {
  const read = { max: 60, windowMs: 60_000 };
  const write = { max: 30, windowMs: 60_000 };

  onRpc<unknown, PhoneProfileView>(RpcEvent.PhoneProfile, async (ctx) => {
    const limited = consume(ctx.session, 'phone:profile', read); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    try {
      const profile = await service.getProfile(id);
      await advanceQuestSafe(id, 'open_phone');
      return ok(profile);
    } catch (error) { return err(mapError(error)); }
  });

  onRpc<unknown, PhoneContactView[]>(RpcEvent.PhoneContacts, async (ctx) => {
    const limited = consume(ctx.session, 'phone:contacts', read); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await service.listContacts(id));
  });

  onRpc<PhoneContactSaveRequest, PhoneContactView>(RpcEvent.PhoneContactSave, async (ctx, payload) => {
    const limited = consume(ctx.session, 'phone:contactSave', write); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (!payload || typeof payload.phoneNumber !== 'string' || typeof payload.displayName !== 'string') return err(ErrorCode.Validation);
    try { return ok(await service.saveContact(id, payload)); } catch (error) { return err(mapError(error)); }
  });

  onRpc<{ limit?: number }, PhoneMessageView[]>(RpcEvent.PhoneMessages, async (ctx, payload) => {
    const limited = consume(ctx.session, 'phone:messages', read); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await service.listMessages(id, payload?.limit));
  });

  onRpc<PhoneSendMessageRequest, PhoneMessageView>(RpcEvent.PhoneSendMessage, async (ctx, payload) => {
    const limited = consume(ctx.session, 'phone:send', write); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    if (!payload || typeof payload.phoneNumber !== 'string' || typeof payload.body !== 'string') return err(ErrorCode.Validation);
    try { return ok(await service.sendMessage(id, payload)); } catch (error) { return err(mapError(error)); }
  });
};
