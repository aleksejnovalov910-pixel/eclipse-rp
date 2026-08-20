import {
  ErrorCode,
  RpcEvent,
  SessionState,
  err,
  ok,
  type InventoryMoveRequest,
  type InventorySplitRequest,
  type InventoryView,
  type Result,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './inventory.service';

const requireCharacter = (state: SessionState, characterId: number | null): Result<number> => {
  if (state !== SessionState.Playing || characterId === null) return err(ErrorCode.Unauthorized);
  return ok(characterId);
};

const mapError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'INVENTORY_ITEM_NOT_FOUND': return ErrorCode.InventoryItemNotFound;
    case 'INVENTORY_SLOT_OCCUPIED': return ErrorCode.InventorySlotOccupied;
    case 'INVENTORY_INVALID_SLOT': return ErrorCode.InventoryInvalidSlot;
    case 'INVENTORY_INVALID_QUANTITY': return ErrorCode.InventoryInvalidQuantity;
    default: return ErrorCode.Internal;
  }
};

export const registerInventoryModule = (): void => {
  const readRule = { max: 60, windowMs: 60_000 };
  const mutateRule = { max: 40, windowMs: 60_000 };

  onRpc<unknown, InventoryView>(RpcEvent.InventoryGet, async (ctx) => {
    const limited = consume(ctx.session, 'inventory:get', readRule);
    if (limited) return limited;
    const character = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (!character.ok) return character;
    return ok(await service.getCharacterInventory(character.data));
  });

  onRpc<InventoryMoveRequest, InventoryView>(RpcEvent.InventoryMove, async (ctx, payload) => {
    const limited = consume(ctx.session, 'inventory:move', mutateRule);
    if (limited) return limited;
    const character = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (!character.ok) return character;
    if (!payload || typeof payload.itemId !== 'string' || !Number.isInteger(payload.toSlot)) {
      return err(ErrorCode.Validation);
    }
    try {
      await service.moveCharacterItem(character.data, payload.itemId, payload.toSlot);
      return ok(await service.getCharacterInventory(character.data));
    } catch (error) {
      return err(mapError(error));
    }
  });

  onRpc<InventorySplitRequest, InventoryView>(RpcEvent.InventorySplit, async (ctx, payload) => {
    const limited = consume(ctx.session, 'inventory:split', mutateRule);
    if (limited) return limited;
    const character = requireCharacter(ctx.session.state, ctx.session.characterId);
    if (!character.ok) return character;
    if (
      !payload ||
      typeof payload.itemId !== 'string' ||
      !Number.isInteger(payload.quantity) ||
      !Number.isInteger(payload.toSlot)
    ) {
      return err(ErrorCode.Validation);
    }
    try {
      await service.splitCharacterItem(character.data, payload.itemId, payload.quantity, payload.toSlot);
      return ok(await service.getCharacterInventory(character.data));
    } catch (error) {
      return err(mapError(error));
    }
  });
};
