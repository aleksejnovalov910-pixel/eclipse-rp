import { sql } from 'kysely';
import type { VehicleAccessView,VehicleView } from '@eclipse/shared';
import { db } from '../../infra/db';

export const canUseVehicle=async(characterId:number,vehicleId:string):Promise<boolean>=>{
 const r=await sql<{ok:boolean}>`SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id=${vehicleId}::uuid AND (v.owner_character_id=${characterId} OR EXISTS(SELECT 1 FROM vehicle_access a WHERE a.vehicle_id=v.id AND a.character_id=${characterId}))) AS ok`.execute(db());
 return Boolean(r.rows[0]?.ok);
};

export const listVehicleAccess=async(ownerCharacterId:number,vehicleId:string):Promise<VehicleAccessView[]>=>{
 const owner=await sql`SELECT id FROM vehicles WHERE id=${vehicleId}::uuid AND owner_character_id=${ownerCharacterId}`.execute(db());if(!owner.rows.length)throw new Error('VEHICLE_NOT_FOUND');
 const r=await sql<{character_id:number;first_name:string;last_name:string;access_level:'driver'|'manager';created_at:Date}>`SELECT a.character_id,c.first_name,c.last_name,a.access_level,a.created_at FROM vehicle_access a JOIN characters c ON c.id=a.character_id WHERE a.vehicle_id=${vehicleId}::uuid ORDER BY a.created_at`.execute(db());
 return r.rows.map(x=>({characterId:x.character_id,firstName:x.first_name,lastName:x.last_name,accessLevel:x.access_level,createdAt:x.created_at.toISOString()}));
};

export const grantVehicleAccess=async(ownerCharacterId:number,vehicleId:string,targetCharacterId:number,level:'driver'|'manager'='driver'):Promise<VehicleAccessView[]>=>{
 if(ownerCharacterId===targetCharacterId)throw new Error('INVALID_TARGET');
 await db().transaction().execute(async trx=>{const owner=await sql`SELECT id FROM vehicles WHERE id=${vehicleId}::uuid AND owner_character_id=${ownerCharacterId} FOR UPDATE`.execute(trx);if(!owner.rows.length)throw new Error('VEHICLE_NOT_FOUND');const target=await trx.selectFrom('characters').select('id').where('id','=',targetCharacterId).where('deleted_at','is',null).executeTakeFirst();if(!target)throw new Error('CHARACTER_NOT_FOUND');await sql`INSERT INTO vehicle_access(vehicle_id,character_id,granted_by_character_id,access_level) VALUES(${vehicleId}::uuid,${targetCharacterId},${ownerCharacterId},${level}) ON CONFLICT(vehicle_id,character_id) DO UPDATE SET access_level=EXCLUDED.access_level,granted_by_character_id=EXCLUDED.granted_by_character_id,created_at=NOW()`.execute(trx);});
 return listVehicleAccess(ownerCharacterId,vehicleId);
};

export const revokeVehicleAccess=async(ownerCharacterId:number,vehicleId:string,targetCharacterId:number):Promise<VehicleAccessView[]>=>{
 const r=await sql`DELETE FROM vehicle_access a USING vehicles v WHERE a.vehicle_id=${vehicleId}::uuid AND a.character_id=${targetCharacterId} AND v.id=a.vehicle_id AND v.owner_character_id=${ownerCharacterId} RETURNING a.character_id`.execute(db());if(!r.rows.length)throw new Error('ACCESS_NOT_FOUND');return listVehicleAccess(ownerCharacterId,vehicleId);
};

export const listSharedVehicles=async(characterId:number):Promise<VehicleView[]>=>{
 const r=await sql<any>`SELECT v.id,v.model,v.vin,v.plate,v.fuel,v.mileage,v.engine_health,v.body_health,v.locked,v.impounded,v.insurance_until FROM vehicles v JOIN vehicle_access a ON a.vehicle_id=v.id WHERE a.character_id=${characterId} ORDER BY v.id`.execute(db());
 return r.rows.map((x:any)=>({id:x.id,model:x.model,vin:x.vin,plate:x.plate,fuel:x.fuel,mileage:x.mileage,engineHealth:x.engine_health,bodyHealth:x.body_health,locked:x.locked,impounded:x.impounded,insuranceUntil:x.insurance_until?new Date(x.insurance_until).toISOString():null,spawned:false}));
};
