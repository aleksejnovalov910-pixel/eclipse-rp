import {
  ErrorCode,
  RpcEvent,
  SessionState,
  err,
  ok,
  type PropertyActionRequest,
  type PropertyOwnedView,
  type PropertyPurchaseResult,
  type PropertySaleResult,
  type PropertyView,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './property.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTERACTION_RADIUS = 5;

const characterId = (state: SessionState, id: number | null): number | null =>
  state === SessionState.Playing && id !== null ? id : null;

const propertyId = (payload: PropertyActionRequest | undefined): string | null =>
  typeof payload?.propertyId === 'string' && UUID_RE.test(payload.propertyId) ? payload.propertyId : null;

const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const mapError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'PROPERTY_NOT_FOUND': return err(ErrorCode.Validation, { reason: 'property_not_found' });
    case 'PROPERTY_NOT_OWNED': return err(ErrorCode.Unauthorized, { reason: 'property_not_owned' });
    case 'PROPERTY_OWNED': return err(ErrorCode.Validation, { reason: 'property_already_owned' });
    case 'INSUFFICIENT_FUNDS': return err(ErrorCode.InsufficientFunds);
    default: throw error;
  }
};

export const registerPropertyModule = (): void => {
  const readRule = { max: 40, windowMs: 60_000 };
  const actionRule = { max: 12, windowMs: 60_000 };

  onRpc<unknown, PropertyView[]>(RpcEvent.PropertyCatalog, async (ctx) => {
    const limited = consume(ctx.session, 'property:catalog', readRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await service.listProperties(id));
  });

  onRpc<unknown, PropertyOwnedView[]>(RpcEvent.PropertyOwned, async (ctx) => {
    const limited = consume(ctx.session, 'property:owned', readRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await service.listOwnedProperties(id));
  });

  onRpc<PropertyActionRequest, PropertyPurchaseResult>(RpcEvent.PropertyBuy, async (ctx, payload) => {
    const limited = consume(ctx.session, 'property:buy', actionRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = propertyId(payload); if (!targetId) return err(ErrorCode.Validation, { field: 'propertyId' });
    try { return ok(await service.buyProperty(id, targetId)); } catch (error) { return mapError(error); }
  });

  onRpc<PropertyActionRequest, PropertySaleResult>(RpcEvent.PropertySell, async (ctx, payload) => {
    const limited = consume(ctx.session, 'property:sell', actionRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = propertyId(payload); if (!targetId) return err(ErrorCode.Validation, { field: 'propertyId' });
    try { return ok(await service.sellPropertyToState(id, targetId)); } catch (error) { return mapError(error); }
  });

  onRpc<PropertyActionRequest, { entered: true }>(RpcEvent.PropertyEnter, async (ctx, payload) => {
    const limited = consume(ctx.session, 'property:enter', actionRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = propertyId(payload); if (!targetId) return err(ErrorCode.Validation, { field: 'propertyId' });
    try {
      const property = await service.getOwnedProperty(id, targetId);
      if (ctx.player.dimension !== property.exterior.dimension || distance(ctx.player.position, property.exterior) > INTERACTION_RADIUS) {
        return err(ErrorCode.Validation, { reason: 'property_too_far' });
      }
      ctx.player.position = new mp.Vector3(property.interior.x, property.interior.y, property.interior.z);
      ctx.player.heading = property.interior.heading;
      ctx.player.dimension = property.interior.dimension;
      return ok({ entered: true as const });
    } catch (error) { return mapError(error); }
  });

  onRpc<PropertyActionRequest, { exited: true }>(RpcEvent.PropertyExit, async (ctx, payload) => {
    const limited = consume(ctx.session, 'property:exit', actionRule); if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId); if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = propertyId(payload); if (!targetId) return err(ErrorCode.Validation, { field: 'propertyId' });
    try {
      const property = await service.getOwnedProperty(id, targetId);
      if (ctx.player.dimension !== property.interior.dimension || distance(ctx.player.position, property.interior) > INTERACTION_RADIUS * 2) {
        return err(ErrorCode.Validation, { reason: 'property_wrong_interior' });
      }
      ctx.player.dimension = property.exterior.dimension;
      ctx.player.position = new mp.Vector3(property.exterior.x, property.exterior.y, property.exterior.z);
      ctx.player.heading = property.exterior.heading;
      return ok({ exited: true as const });
    } catch (error) { return mapError(error); }
  });
};
