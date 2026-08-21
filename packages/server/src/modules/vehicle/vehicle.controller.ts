import { ErrorCode, RpcEvent, SessionState, err, ok, type FuelStationView, type VehicleActionView, type VehicleRefuelResult, type VehicleView } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import {
  listOwnedVehicles,
  spawnOwnedVehicle,
  storeOwnedVehicle,
  storeVehiclesForPlayer,
  toggleOwnedVehicleLock,
} from './vehicle.service';
import { listFuelStations, refuel } from './fuel.service';

const characterId = (state: SessionState, id: number | null): number | null =>
  state === SessionState.Playing && id !== null ? id : null;

const mapError = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'VEHICLE_NOT_FOUND': return err(ErrorCode.CharacterNotFound, { reason: 'vehicle_not_found' });
    case 'VEHICLE_IMPOUNDED': return err(ErrorCode.Validation, { reason: 'vehicle_impounded' });
    case 'VEHICLE_ALREADY_SPAWNED': return err(ErrorCode.Validation, { reason: 'vehicle_already_spawned' });
    case 'VEHICLE_NOT_SPAWNED': return err(ErrorCode.Validation, { reason: 'vehicle_not_spawned' });
    case 'INVALID_LITERS': return err(ErrorCode.Validation, { reason: 'invalid_liters' });
    case 'STATION_NOT_FOUND': return err(ErrorCode.Validation, { reason: 'station_not_found' });
    case 'TOO_FAR': return err(ErrorCode.Validation, { reason: 'too_far_from_station' });
    case 'STATION_OUT_OF_FUEL': return err(ErrorCode.Validation, { reason: 'station_out_of_fuel' });
    case 'TANK_FULL': return err(ErrorCode.Validation, { reason: 'tank_full' });
    case 'INSUFFICIENT_FUNDS': return err(ErrorCode.InsufficientFunds);
    default: throw error;
  }
};

const vehicleId = (payload: { vehicleId?: unknown } | undefined): string | null =>
  typeof payload?.vehicleId === 'string' && payload.vehicleId.length > 0 ? payload.vehicleId : null;

export const registerVehicleModule = (): void => {
  const readRule = { max: 30, windowMs: 60_000 };
  const actionRule = { max: 12, windowMs: 60_000 };

  onRpc<unknown, VehicleView[]>(RpcEvent.VehicleList, async (ctx) => {
    const limited = consume(ctx.session, 'vehicle:list', readRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await listOwnedVehicles(id));
  });

  onRpc<unknown, FuelStationView[]>(RpcEvent.FuelStations, async (ctx) => {
    const limited = consume(ctx.session, 'fuel:stations', readRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    return ok(await listFuelStations());
  });

  onRpc<{ vehicleId?: string }, VehicleActionView>(RpcEvent.VehicleSpawn, async (ctx, payload) => {
    const limited = consume(ctx.session, 'vehicle:spawn', actionRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = vehicleId(payload);
    if (!targetId) return err(ErrorCode.Validation, { field: 'vehicleId' });
    try { return ok(await spawnOwnedVehicle(id, ctx.player, targetId)); }
    catch (error) { return mapError(error); }
  });

  onRpc<{ vehicleId?: string }, VehicleActionView>(RpcEvent.VehicleStore, async (ctx, payload) => {
    const limited = consume(ctx.session, 'vehicle:store', actionRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = vehicleId(payload);
    if (!targetId) return err(ErrorCode.Validation, { field: 'vehicleId' });
    try { return ok(await storeOwnedVehicle(id, targetId)); }
    catch (error) { return mapError(error); }
  });

  onRpc<{ vehicleId?: string }, VehicleView>(RpcEvent.VehicleToggleLock, async (ctx, payload) => {
    const limited = consume(ctx.session, 'vehicle:toggleLock', actionRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = vehicleId(payload);
    if (!targetId) return err(ErrorCode.Validation, { field: 'vehicleId' });
    try { return ok(await toggleOwnedVehicleLock(id, targetId)); }
    catch (error) { return mapError(error); }
  });

  onRpc<{ vehicleId?: string; stationId?: string; liters?: number }, VehicleRefuelResult>(RpcEvent.VehicleRefuel, async (ctx, payload) => {
    const limited = consume(ctx.session, 'vehicle:refuel', actionRule);
    if (limited) return limited;
    const id = characterId(ctx.session.state, ctx.session.characterId);
    if (id === null) return err(ErrorCode.Unauthorized);
    const targetId = vehicleId(payload);
    if (!targetId || typeof payload?.stationId !== 'string' || !Number.isInteger(payload?.liters)) return err(ErrorCode.Validation);
    try { return ok(await refuel(id, ctx.player, targetId, payload.stationId, payload.liters!)); }
    catch (error) { return mapError(error); }
  });

  mp.events.add('playerQuit', (player: PlayerMp) => {
    void storeVehiclesForPlayer(player.id);
  });
};