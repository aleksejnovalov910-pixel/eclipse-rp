import type { VehicleActionView, VehicleView } from '@eclipse/shared';
import { createLogger } from '../../core/logger';
import { db } from '../../infra/db';

const log = createLogger('vehicle');

interface VehicleRow {
  id: string;
  model: string;
  vin: string;
  plate: string | null;
  fuel: string;
  mileage: string;
  engine_health: string;
  body_health: string;
  locked: boolean;
  impounded: boolean;
  insurance_until: Date | null;
}

interface SpawnedVehicle {
  entity: VehicleMp;
  ownerCharacterId: number;
  ownerPlayerId: number;
}

const spawned = new Map<string, SpawnedVehicle>();

const isAlive = (entry: SpawnedVehicle | undefined): entry is SpawnedVehicle =>
  entry !== undefined && mp.vehicles.exists(entry.entity);

const cleanupStale = (vehicleId: string): void => {
  const entry = spawned.get(vehicleId);
  if (entry && !mp.vehicles.exists(entry.entity)) spawned.delete(vehicleId);
};

const toView = (row: VehicleRow): VehicleView => {
  cleanupStale(row.id);
  return {
    id: row.id,
    model: row.model,
    vin: row.vin,
    plate: row.plate,
    fuel: row.fuel,
    mileage: row.mileage,
    engineHealth: row.engine_health,
    bodyHealth: row.body_health,
    locked: row.locked,
    impounded: row.impounded,
    insuranceUntil: row.insurance_until ? row.insurance_until.toISOString() : null,
    spawned: spawned.has(row.id),
  };
};

const ownedRow = async (characterId: number, vehicleId: string): Promise<VehicleRow> => {
  const row = await db()
    .selectFrom('vehicles')
    .select([
      'id', 'model', 'vin', 'plate', 'fuel', 'mileage', 'engine_health', 'body_health',
      'locked', 'impounded', 'insurance_until',
    ])
    .where('id', '=', vehicleId)
    .where('owner_character_id', '=', characterId)
    .executeTakeFirst();
  if (!row) throw new Error('VEHICLE_NOT_FOUND');
  return row as unknown as VehicleRow;
};

export const listOwnedVehicles = async (characterId: number): Promise<VehicleView[]> => {
  const rows = await db()
    .selectFrom('vehicles')
    .select([
      'id', 'model', 'vin', 'plate', 'fuel', 'mileage', 'engine_health', 'body_health',
      'locked', 'impounded', 'insurance_until',
    ])
    .where('owner_character_id', '=', characterId)
    .orderBy('id')
    .execute() as unknown as VehicleRow[];
  return rows.map(toView);
};

const deliveryPosition = (player: PlayerMp): Vector3 => {
  const heading = Number.isFinite(player.heading) ? player.heading : 0;
  const radians = heading * Math.PI / 180;
  return new mp.Vector3(
    player.position.x + Math.sin(radians) * 4,
    player.position.y + Math.cos(radians) * 4,
    player.position.z,
  );
};

export const spawnOwnedVehicle = async (
  characterId: number,
  player: PlayerMp,
  vehicleId: string,
): Promise<VehicleActionView> => {
  const row = await ownedRow(characterId, vehicleId);
  if (row.impounded) throw new Error('VEHICLE_IMPOUNDED');

  cleanupStale(vehicleId);
  const existing = spawned.get(vehicleId);
  if (isAlive(existing)) throw new Error('VEHICLE_ALREADY_SPAWNED');

  const position = deliveryPosition(player);
  const entity = mp.vehicles.new(mp.joaat(row.model), position, {
    heading: player.heading,
    numberPlate: (row.plate ?? 'ECLIPSE').slice(0, 8),
    locked: row.locked,
    engine: false,
    dimension: player.dimension,
  });

  const bodyHealth = Number(row.body_health);
  if (Number.isFinite(bodyHealth)) entity.bodyHealth = bodyHealth;

  spawned.set(vehicleId, { entity, ownerCharacterId: characterId, ownerPlayerId: player.id });
  log.info(`машина ${vehicleId} (${row.model}) доставлена character=${characterId}`);
  return { vehicle: { ...toView(row), spawned: true }, spawned: true };
};

const persistEntity = async (vehicleId: string, entry: SpawnedVehicle): Promise<void> => {
  if (!mp.vehicles.exists(entry.entity)) return;
  const { position } = entry.entity;
  await db()
    .updateTable('vehicles')
    .set({
      position_x: String(position.x.toFixed(3)),
      position_y: String(position.y.toFixed(3)),
      position_z: String(position.z.toFixed(3)),
      heading: String(entry.entity.heading.toFixed(2)),
      dimension: entry.entity.dimension,
      engine_health: String(Math.max(0, entry.entity.engineHealth).toFixed(2)),
      body_health: String(Math.max(0, entry.entity.bodyHealth).toFixed(2)),
      locked: entry.entity.locked,
      updated_at: new Date(),
    })
    .where('id', '=', vehicleId)
    .where('owner_character_id', '=', entry.ownerCharacterId)
    .execute();
};

export const storeOwnedVehicle = async (characterId: number, vehicleId: string): Promise<VehicleActionView> => {
  await ownedRow(characterId, vehicleId);
  cleanupStale(vehicleId);
  const entry = spawned.get(vehicleId);
  if (!entry || entry.ownerCharacterId !== characterId || !mp.vehicles.exists(entry.entity)) {
    throw new Error('VEHICLE_NOT_SPAWNED');
  }

  await persistEntity(vehicleId, entry);
  entry.entity.destroy();
  spawned.delete(vehicleId);
  const refreshed = await ownedRow(characterId, vehicleId);
  log.info(`машина ${vehicleId} возвращена в гараж character=${characterId}`);
  return { vehicle: { ...toView(refreshed), spawned: false }, spawned: false };
};

export const toggleOwnedVehicleLock = async (characterId: number, vehicleId: string): Promise<VehicleView> => {
  const row = await ownedRow(characterId, vehicleId);
  const locked = !row.locked;
  await db().updateTable('vehicles').set({ locked, updated_at: new Date() })
    .where('id', '=', vehicleId).where('owner_character_id', '=', characterId).execute();

  cleanupStale(vehicleId);
  const entry = spawned.get(vehicleId);
  if (entry && entry.ownerCharacterId === characterId && mp.vehicles.exists(entry.entity)) entry.entity.locked = locked;
  return { ...toView({ ...row, locked }), locked };
};

export const storeVehiclesForPlayer = async (playerId: number): Promise<void> => {
  const entries = [...spawned.entries()].filter(([, entry]) => entry.ownerPlayerId === playerId);
  for (const [vehicleId, entry] of entries) {
    try {
      await persistEntity(vehicleId, entry);
    } catch (error) {
      log.error(`не удалось сохранить машину ${vehicleId} при выходе`, error);
    } finally {
      if (mp.vehicles.exists(entry.entity)) entry.entity.destroy();
      spawned.delete(vehicleId);
    }
  }
};
