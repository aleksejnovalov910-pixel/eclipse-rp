import { sql } from 'kysely';
import type { VehicleTuningInstallResult,VehicleTuningOption,VehicleTuningState } from '@eclipse/shared';
import { db } from '../../infra/db';
import { getSpawnedOwnedVehicleEntity } from './vehicle.service';

interface ShopRow{id:string;markup_percent:number;position_x:string;position_y:string;position_z:string;}
interface VehicleRow{tuning:unknown;}
const OPTIONS:VehicleTuningOption[]=[
 {key:'engine_1',name:'Двигатель Stage 1',category:'engine',modType:11,modIndex:0,basePrice:'18000'},
 {key:'engine_2',name:'Двигатель Stage 2',category:'engine',modType:11,modIndex:1,basePrice:'36000'},
 {key:'engine_3',name:'Двигатель Stage 3',category:'engine',modType:11,modIndex:2,basePrice:'72000'},
 {key:'brakes_1',name:'Спортивные тормоза',category:'brakes',modType:12,modIndex:0,basePrice:'12000'},
 {key:'brakes_2',name:'Гоночные тормоза',category:'brakes',modType:12,modIndex:1,basePrice:'26000'},
 {key:'transmission_1',name:'Спортивная КПП',category:'transmission',modType:13,modIndex:0,basePrice:'15000'},
 {key:'transmission_2',name:'Гоночная КПП',category:'transmission',modType:13,modIndex:1,basePrice:'32000'},
 {key:'suspension_1',name:'Спортивная подвеска',category:'suspension',modType:15,modIndex:0,basePrice:'11000'},
 {key:'suspension_2',name:'Низкая подвеска',category:'suspension',modType:15,modIndex:1,basePrice:'24000'}
];
const dist=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const parseInstalled=(value:unknown):Record<string,number>=>{if(!value||typeof value!=='object'||Array.isArray(value))return{};const source=value as Record<string,unknown>,result:Record<string,number>={};for(const [k,v] of Object.entries(source))if(Number.isInteger(v))result[k]=Number(v);return result;};
export const listTuningOptions=async():Promise<VehicleTuningOption[]>=>OPTIONS;
export const getTuningState=async(characterId:number,vehicleId:string):Promise<VehicleTuningState>=>{const row=await db().selectFrom('vehicles').select('tuning').where('id','=',vehicleId).where('owner_character_id','=',characterId).executeTakeFirst() as VehicleRow|undefined;if(!row)throw new Error('VEHICLE_NOT_FOUND');return{vehicleId,installed:parseInstalled(row.tuning)};};
export const installTuning=async(characterId:number,player:PlayerMp,vehicleId:string,businessId:string,optionKey:string):Promise<VehicleTuningInstallResult>=>{const option=OPTIONS.find(x=>x.key===optionKey);if(!option)throw new Error('TUNING_OPTION_NOT_FOUND');const entity=getSpawnedOwnedVehicleEntity(characterId,vehicleId);if(!entity)throw new Error('VEHICLE_NOT_SPAWNED');const shopRes=await sql<ShopRow>`SELECT id,markup_percent,position_x,position_y,position_z FROM businesses WHERE id=${businessId}::uuid AND kind='service'`.execute(db());const shop=shopRes.rows[0];if(!shop)throw new Error('SERVICE_NOT_FOUND');const pos={x:Number(shop.position_x),y:Number(shop.position_y),z:Number(shop.position_z)};if(dist(player.position,pos)>12||dist(entity.position,pos)>12)throw new Error('TOO_FAR');const total=(Number(option.basePrice)*(1+shop.markup_percent/100)).toFixed(2);
 const result=await db().transaction().execute(async trx=>{const vehicle=await trx.selectFrom('vehicles').select(['tuning']).where('id','=',vehicleId).where('owner_character_id','=',characterId).forUpdate().executeTakeFirst() as VehicleRow|undefined;if(!vehicle)throw new Error('VEHICLE_NOT_FOUND');const installed=parseInstalled(vehicle.tuning);if(installed[option.category]===option.modIndex)throw new Error('TUNING_ALREADY_INSTALLED');const ch=await trx.selectFrom('characters').select('id').where('id','=',characterId).where(sql<boolean>`bank>=${total}::numeric`).forUpdate().executeTakeFirst();if(!ch)throw new Error('INSUFFICIENT_FUNDS');installed[option.category]=option.modIndex;const updated=await trx.updateTable('characters').set({bank:sql<string>`bank-${total}::numeric`,updated_at:new Date()}).where('id','=',characterId).returning('bank').executeTakeFirstOrThrow();await trx.updateTable('vehicles').set({tuning:installed,updated_at:new Date()}).where('id','=',vehicleId).execute();await sql`UPDATE businesses SET bank_balance=bank_balance+${total}::numeric,updated_at=NOW() WHERE id=${businessId}::uuid`.execute(trx);await sql`INSERT INTO business_transactions(business_id,character_id,kind,amount,metadata) VALUES(${businessId}::uuid,${characterId},'vehicle_tuning',${total}::numeric,${JSON.stringify({vehicleId,optionKey})}::jsonb)`.execute(trx);await trx.insertInto('economy_ledger').values({character_id:characterId,family_id:null,source:'vehicle_tuning',direction:'sink',amount:total,metadata:{businessId,vehicleId,optionKey}}).execute();return{bank:updated.bank,installed};});
 const modded=entity as VehicleMp&{setMod?:(type:number,index:number)=>void};if(typeof modded.setMod==='function')modded.setMod(option.modType,option.modIndex);return{tuning:{vehicleId,installed:result.installed},paid:total,bank:result.bank};};
