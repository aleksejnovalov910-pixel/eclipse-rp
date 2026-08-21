import { sql } from 'kysely';
import type { FuelStationView,VehicleRefuelResult } from '@eclipse/shared';
import { db } from '../../infra/db';
import { getSpawnedOwnedVehicleEntity } from './vehicle.service';

interface FuelBusiness{id:string;name:string;bank_balance:string;stock:number;wholesale_unit_cost:string;markup_percent:number;position_x:string;position_y:string;position_z:string;}
const dist=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const stationView=(b:FuelBusiness):FuelStationView=>{const price=(Number(b.wholesale_unit_cost)*(1+b.markup_percent/100)).toFixed(2);return{id:b.id,name:b.name,stock:b.stock,pricePerLiter:price,position:{x:Number(b.position_x),y:Number(b.position_y),z:Number(b.position_z)}};};
export const listFuelStations=async():Promise<FuelStationView[]>=>{const r=await sql<FuelBusiness>`SELECT id,name,bank_balance,stock,wholesale_unit_cost,markup_percent,position_x,position_y,position_z FROM businesses WHERE kind='fuel' ORDER BY name`.execute(db());return r.rows.map(stationView);};
export const refuel=async(characterId:number,player:PlayerMp,vehicleId:string,stationId:string,liters:number):Promise<VehicleRefuelResult>=>{
 if(!Number.isInteger(liters)||liters<1||liters>100)throw new Error('INVALID_LITERS');
 const entity=getSpawnedOwnedVehicleEntity(characterId,vehicleId);if(!entity)throw new Error('VEHICLE_NOT_SPAWNED');
 return db().transaction().execute(async trx=>{
  const sr=await sql<FuelBusiness>`SELECT id,name,bank_balance,stock,wholesale_unit_cost,markup_percent,position_x,position_y,position_z FROM businesses WHERE id=${stationId}::uuid AND kind='fuel' FOR UPDATE`.execute(trx);const station=sr.rows[0];if(!station)throw new Error('STATION_NOT_FOUND');const point={x:Number(station.position_x),y:Number(station.position_y),z:Number(station.position_z)};
  if(player.dimension!==0||entity.dimension!==0||dist(player.position,point)>12||dist(entity.position,point)>12||dist(player.position,entity.position)>8)throw new Error('TOO_FAR');
  if(station.stock<liters)throw new Error('STATION_OUT_OF_FUEL');
  const vr=await sql<{fuel:string}>`SELECT fuel FROM vehicles WHERE id=${vehicleId}::uuid AND owner_character_id=${characterId} FOR UPDATE`.execute(trx);const v=vr.rows[0];if(!v)throw new Error('VEHICLE_NOT_FOUND');const current=Number(v.fuel);const actual=Math.min(liters,Math.max(0,Math.floor(100-current)));if(actual<1)throw new Error('TANK_FULL');
  const unit=(Number(station.wholesale_unit_cost)*(1+station.markup_percent/100));const total=(unit*actual).toFixed(2);const ch=await trx.selectFrom('characters').select('id').where('id','=',characterId).where(sql<boolean>`bank>=${total}::numeric`).forUpdate().executeTakeFirst();if(!ch)throw new Error('INSUFFICIENT_FUNDS');
  const updated=await trx.updateTable('characters').set({bank:sql<string>`bank-${total}::numeric`,updated_at:new Date()}).where('id','=',characterId).returning('bank').executeTakeFirstOrThrow();const newFuel=Math.min(100,current+actual).toFixed(2);
  await sql`UPDATE vehicles SET fuel=${newFuel}::numeric,updated_at=NOW() WHERE id=${vehicleId}::uuid`.execute(trx);await sql`UPDATE businesses SET stock=stock-${actual},bank_balance=bank_balance+${total}::numeric,updated_at=NOW() WHERE id=${stationId}::uuid`.execute(trx);await sql`INSERT INTO business_transactions(business_id,character_id,kind,amount,metadata) VALUES(${stationId}::uuid,${characterId},'fuel_sale',${total}::numeric,${JSON.stringify({vehicleId,liters:actual})}::jsonb)`.execute(trx);await trx.insertInto('economy_ledger').values({character_id:characterId,family_id:null,source:'fuel_purchase',direction:'sink',amount:total,metadata:{stationId,vehicleId,liters:actual}}).execute();
  return{vehicleId,fuel:newFuel,liters:actual,totalCost:total,bank:updated.bank,station:{...stationView({...station,stock:station.stock-actual,bank_balance:String(Number(station.bank_balance)+Number(total))})}};
 });
};
