import { sql } from 'kysely';
import { db } from '../../infra/db';
type Row={id:string;model:string;x:string;y:string;z:string;rx:string;ry:string;rz:string;dimension:number;};
const spawned=new Map<string,ObjectMp>();
const alive=(o:ObjectMp|undefined):o is ObjectMp=>!!o&&mp.objects.exists(o);
export const ensurePropertyFurniture=async(propertyId:string):Promise<void>=>{const q=await sql<Row>`SELECT f.id::text,f.model,f.position_x::text x,f.position_y::text y,f.position_z::text z,f.rotation_x::text rx,f.rotation_y::text ry,f.rotation_z::text rz,p.instance_dimension dimension FROM property_furniture f JOIN properties p ON p.id=f.property_id WHERE f.property_id=${propertyId}::uuid`.execute(db());const keep=new Set(q.rows.map(x=>x.id));for(const[id,o]of spawned){if(!keep.has(id)&&alive(o)){o.destroy();spawned.delete(id);}}for(const r of q.rows){const old=spawned.get(r.id);if(alive(old))continue;if(old)spawned.delete(r.id);const entity=mp.objects.new(mp.joaat(r.model),new mp.Vector3(Number(r.x),Number(r.y),Number(r.z)),{rotation:new mp.Vector3(Number(r.rx),Number(r.ry),Number(r.rz)),dimension:r.dimension});spawned.set(r.id,entity);}};
export const removeFurnitureEntity=(id:string):void=>{const o=spawned.get(id);if(alive(o))o.destroy();spawned.delete(id);};
