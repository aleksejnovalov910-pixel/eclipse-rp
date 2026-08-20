import { ErrorCode, RpcEvent, SessionState, err, ok, type BankTransactionView, type Result } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import type { Session } from '../../core/session';
import * as service from './economy.service';
import { listBankTransactions } from './economy.history';

interface AmountRequest { amount: string; }
interface TransferRequest extends AmountRequest { toCharacterId: number; description?: string; }

const requirePlayingCharacter = (session: Session): Result<number> => {
  if (session.state !== SessionState.Playing || session.characterId === null) return err(ErrorCode.Unauthorized);
  return ok(session.characterId);
};

const mapEconomyError = (error: unknown): ReturnType<typeof err> => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'INVALID_AMOUNT': return err(ErrorCode.InvalidAmount);
    case 'INSUFFICIENT_FUNDS': return err(ErrorCode.InsufficientFunds);
    case 'SAME_ACCOUNT': return err(ErrorCode.SameAccount);
    case 'CHARACTER_NOT_FOUND': return err(ErrorCode.CharacterNotFound);
    default: throw error;
  }
};

export const registerEconomyModule = (): void => {
  const readRule = { max: 60, windowMs: 60_000 };
  const moneyRule = { max: 20, windowMs: 60_000 };
  const transferRule = { max: 12, windowMs: 60_000 };

  onRpc<unknown, service.BalanceSnapshot>(RpcEvent.EconomyBalance, async (ctx) => {
    const limited = consume(ctx.session, 'economy:balance', readRule); if (limited) return limited;
    const character = requirePlayingCharacter(ctx.session); if (!character.ok) return character;
    try { return ok(await service.getBalance(character.data)); } catch (error) { return mapEconomyError(error); }
  });

  onRpc<{ limit?: number }, BankTransactionView[]>(RpcEvent.EconomyHistory, async (ctx, payload) => {
    const limited = consume(ctx.session, 'economy:history', readRule); if (limited) return limited;
    const character = requirePlayingCharacter(ctx.session); if (!character.ok) return character;
    return ok(await listBankTransactions(character.data, payload?.limit));
  });

  onRpc<AmountRequest, service.BalanceSnapshot>(RpcEvent.EconomyDeposit, async (ctx, payload) => {
    const limited = consume(ctx.session, 'economy:deposit', moneyRule); if (limited) return limited;
    const character = requirePlayingCharacter(ctx.session); if (!character.ok) return character;
    try { await service.depositCash(character.data, payload?.amount ?? ''); return ok(await service.getBalance(character.data)); }
    catch (error) { return mapEconomyError(error); }
  });

  onRpc<AmountRequest, service.BalanceSnapshot>(RpcEvent.EconomyWithdraw, async (ctx, payload) => {
    const limited = consume(ctx.session, 'economy:withdraw', moneyRule); if (limited) return limited;
    const character = requirePlayingCharacter(ctx.session); if (!character.ok) return character;
    try { await service.withdrawCash(character.data, payload?.amount ?? ''); return ok(await service.getBalance(character.data)); }
    catch (error) { return mapEconomyError(error); }
  });

  onRpc<TransferRequest, service.BalanceSnapshot>(RpcEvent.EconomyTransfer, async (ctx, payload) => {
    const limited = consume(ctx.session, 'economy:transfer', transferRule); if (limited) return limited;
    const character = requirePlayingCharacter(ctx.session); if (!character.ok) return character;
    if (!Number.isInteger(payload?.toCharacterId) || payload.toCharacterId <= 0) return err(ErrorCode.Validation, { field: 'toCharacterId' });
    const description = typeof payload.description === 'string' ? payload.description.trim().slice(0, 120) : 'Перевод';
    try {
      await service.transferBank(character.data, payload.toCharacterId, payload?.amount ?? '', description || 'Перевод');
      return ok(await service.getBalance(character.data));
    } catch (error) { return mapEconomyError(error); }
  });
};
