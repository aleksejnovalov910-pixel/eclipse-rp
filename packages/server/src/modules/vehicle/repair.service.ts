import { sql } from 'kysely';
import type { VehicleRepairQuote,VehicleRepairResult,VehicleServiceShopView,VehicleView } from '@eclipse/shared';
import { db } from '../../infra/db';
import { getSpawnedOwnedVehicleEntity, listOwnedVehicles } from './vehicle.service';

interface ShopRow{id:string;name:string;stock:number;markup_percent:number;position_x:string;position_y:string;position_z:string;}
const distance=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const shopView=(r:ShopRow):VehicleServiceShopView=>({id:r.id,name:r.name,stock:r.stock,priceMultiplier:1+r.markup_percent/100,position:{x:Number(r.position_x),y:Number(r.position_y),z:Number(r.position_z)}});

export const listServiceShops=async():Promise<VehicleServiceShopView[]>=>{
 const r=await sql<ShopRow>`SELECT id,name,stock,markup_percent,position_x,position_y,position_z FROM businesses WHERE kind='service' ORDER BY name`.execute(db());
 return r.rows.map(shopView);
};

const repairContext=async(characterId:number,player:PlayerMp,vehicleId:string,businessId:string)=>{
 const entity=getSpawnedOwnedVehicleEntity(characterId,vehicleId);if(!entity)throw new Error('VEHICLE_NOT_SPAWNED');
 const sr=await sql<ShopRow>`SELECT id,name,stock,markup_percent,position_x,position_y,position_z FROM businesses WHERE id=${businessId}::uuid AND kind='service'`.execute(db());
 const shop=sr.rows[0];if(!shop)throw new Error('SERVICE_NOT_FOUND');
 const p={x:Number(shop.position_x),y:Number(shop.position_y),z:Number(shop.position_z)};
 if(distance(player.position,p)>12||distance(entity.position,p)>12)throw new Error('TOO_FAR');
 const vehicles=await listOwnedVehicles(characterId);const vehicle=vehicles.find(v=>v.id===vehicleId);if(!vehicle)throw new Error('VEHICLE_NOT_FOUND');
 const engineDamage=Math.max(0,1000-Number(vehicle.engineHealth));const bodyDamage=Math.max(0,1000-Number(vehicle.bodyHealth));
 const base=Math.max(250,engineDamage*2.4+bodyDamage*1.2);const total=(base*(1+shop.markup_percent/100)).toFixed(2);
 return{entity,shop,vehicle,engineDamage,bodyDamage,total};
};

export const quoteRepair=async(characterId:number,player:PlayerMp,vehicleId:string,businessId:string):Promise<VehicleRepairQuote>=>{
 const c=await repairContext(characterId,player,vehicleId,businessId);
 return{vehicleId,businessId,engineDamage:Math.round(c.engineDamage),bodyDamage:Math.round(c.bodyDamage),total:c.total};
};

export const repairVehicle=async(characterId:number,player:PlayerMp,vehicleId:string,businessId:string):Promise<VehicleRepairResult>=>{
 const c=await repairContext(characterId,player,vehicleId,businessId);if(c.engineDamage<1&&c.bodyDamage<1)throw new Error('NO_REPAIR_NEEDED');
 const bank=await db().transaction().execute(async trx=>{
  const shopLock=await sql<ShopRow>`SELECT id,name,stock,markup_percent,position_x,position_y,position_z FROM businesses WHERE id=${businessId}::uuid AND kind='service' FOR UPDATE`.execute(trx);
  if(!shopLock.rows[0])throw new Error('SERVICE_NOT_FOUND');if(shopLock.rows[0].stock<1)throw new Error('SERVICE_OUT_OF_STOCK');
  const ch=await trx.selectFrom('characters').select('id').where('id','=',characterId).where(sql<boolean>`bank>=${c.total}::numeric`).forUpdate().executeTakeFirst();if(!ch)throw new Error('INSUFFICIENT_FUNDS');
  const updated=await trx.updateTable('characters').set({bank:sql<string>`bank-${c.total}::numeric`,updated_at:new Date()}).where('id','=',characterId).returning('bank').executeTakeFirstOrThrow();
  await sql`UPDATE businesses SET stock=stock-1,bank_balance=bank_balance+${c.total}::numeric,updated_at=NOW() WHERE id=${businessId}::uuid`.execute(trx);
  await sql`UPDATE vehicles SET engine_health=1000,body_health=1000,updated_at=NOW() WHERE id=${vehicleId}::uuid AND owner_character_id=${characterId}`.execute(trx);
  await sql`INSERT INTO business_transactions(business_id,character_id,kind,amount,metadata) VALUES(${businessId}::uuid,${characterId},'vehicle_repair',${c.total}::numeric,${JSON.stringify({vehicleId,engineDamage:Math.round(c.engineDamage),bodyDamage:Math.round(c.bodyDamage)})}::jsonb)`.execute(trx);
  await trx.insertInto('economy_ledger').values({character_id:characterId,family_id:null,source:'vehicle_repair',direction:'sink',amount:c.total,metadata:{businessId,vehicleId}}).execute();
  return updated.bank;
 });
 const repairable=c.entity as VehicleMp & {repair?:()=>void};if(typeof repairable.repair==='function')repairable.repair();
 c.entity.bodyHealth=1000;
 const refreshed=(await listOwnedVehicles(characterId)).find(v=>v.id===vehicleId);if(!refreshed)throw new Error('VEHICLE_NOT_FOUND');
 return{vehicle:refreshed as VehicleView,paid:c.total,bank};
};
