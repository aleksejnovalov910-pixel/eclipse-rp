import type { VehicleView } from '@eclipse/shared';
import { db } from '../../infra/db';

export const listOwnedVehicles = async (characterId: number): Promise<VehicleView[]> => {
  const rows = await db()
    .selectFrom('vehicles')
    .select([
      'id',
      'model',
      'vin',
      'plate',
      'fuel',
      'mileage',
      'engine_health',
      'body_health',
      'locked',
      'impounded',
      'insurance_until',
    ])
    .where('owner_character_id', '=', characterId)
    .orderBy('id')
    .execute();

  return rows.map((row) => ({
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
  }));
};
