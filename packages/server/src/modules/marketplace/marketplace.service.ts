import { sql } from 'kysely';
import type { MarketplaceCreateRequest,MarketplaceListingView,MarketplaceObjectType,MarketplacePurchaseResult } from '@eclipse/shared';
import { db } from '../../infra/db';
import { listOwnedVehicles } from '../vehicle/vehicle.service';

interface ListingRow{id:string;seller_character_id:number;object_type:MarketplaceObjectType;object_id:string;title:string;price:string;status:string;buyer_character_id:number|null;expires_at:Date;created_at:Date;sold_at:Date|null;}
const MONEY=/^(?:[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const toView=(r:ListingRow,c:number):MarketplaceListingView=>({id:r.id,sellerCharacterId:r.seller_character_id,objectType:r.object_type,objectId:r.object_id,title:r.title,price:r.price,status:r.status,expiresAt:r.expires_at.toISOString(),createdAt:r.created_at.toISOString(),ownedByMe:r.seller_character_id===c});
const activeSql=sql<ListingRow>`SELECT * FROM marketplace_listings WHERE status='active' AND expires_at>NOW()`;
export const listActive=async(c:number):Promise<MarketplaceListingView[]>=>{const r=await sql<ListingRow>`SELECT * FROM marketplace_listings WHERE status='active' AND expires_at>NOW() ORDER BY created_at DESC LIMIT 200`.execute(db());return r.rows.map(x=>toView(x,c));};
export const listMine=async(c:number):Promise<MarketplaceListingView[]>=>{const r=await sql<ListingRow>`SELECT * FROM marketplace_listings WHERE seller_character_id=${c} ORDER BY created_at DESC LIMIT 100`.execute(db());return r.rows.map(x=>toView(x,c));};

const ownedObject=async(c:number,type:MarketplaceObjectType,id:string):Promise<string>=>{
 if(type==='vehicle'){const cars=await listOwnedVehicles(c);const car=cars.find(v=>v.id===id);if(!car)throw new Error('OBJECT_NOT_OWNED');if(car.spawned)throw new Error('OBJECT_BUSY');if(car.impounded)throw new Error('OBJECT_BUSY');return `${car.model}${car.plate?` · ${car.plate}`:''}`;}
 if(type==='property'){const r=await sql<{name:string}>`SELECT name FROM properties WHERE id=${id}::uuid AND owner_character_id=${c}`.execute(db());if(!r.rows[0])throw new Error('OBJECT_NOT_OWNED');return r.rows[0].name;}
 if(type==='business'){const r=await sql<{name:string}>`SELECT name FROM businesses WHERE id=${id}::uuid AND owner_character_id=${c}`.execute(db());if(!r.rows[0])throw new Error('OBJECT_NOT_OWNED');return r.rows[0].name;}
 throw new Error('INVALID_OBJECT_TYPE');
};

export const createListing=async(c:number,p:MarketplaceCreateRequest):Promise<MarketplaceListingView>=>{
 if(!p||!['vehicle','property','business'].includes(p.objectType)||typeof p.objectId!=='string'||!MONEY.test(String(p.price??'').trim()))throw new Error('INVALID_LISTING');
 const title=await ownedObject(c,p.objectType,p.objectId);const price=String(p.price).trim();
 try{const r=await sql<ListingRow>`INSERT INTO marketplace_listings(seller_character_id,object_type,object_id,title,price) VALUES(${c},${p.objectType},${p.objectId}::uuid,${title},${price}::numeric) RETURNING *`.execute(db());return toView(r.rows[0]!,c);}catch(e:unknown){const code=typeof e==='object'&&e&&'code'in e?String((e as {code?:unknown}).code):'';if(code==='23505')throw new Error('ALREADY_LISTED');throw e;}
};

export const cancelListing=async(c:number,id:string):Promise<MarketplaceListingView>=>db().transaction().execute(async trx=>{const r=await sql<ListingRow>`SELECT * FROM marketplace_listings WHERE id=${id}::uuid FOR UPDATE`.execute(trx);const l=r.rows[0];if(!l||l.seller_character_id!==c||l.status!=='active')throw new Error('LISTING_NOT_ACTIVE');const u=await sql<ListingRow>`UPDATE marketplace_listings SET status='cancelled' WHERE id=${id}::uuid RETURNING *`.execute(trx);return toView(u.rows[0]!,c);});

export const buyListing=async(buyer:number,id:string):Promise<MarketplacePurchaseResult>=>{
 const pre=await sql<ListingRow>`SELECT * FROM marketplace_listings WHERE id=${id}::uuid AND status='active'`.execute(db());const preListing=pre.rows[0];if(!preListing)throw new Error('LISTING_NOT_ACTIVE');if(preListing.object_type==='vehicle'){const cars=await listOwnedVehicles(preListing.seller_character_id);const car=cars.find(v=>v.id===preListing.object_id);if(!car||car.spawned||car.impounded)throw new Error('OBJECT_BUSY');}
 return db().transaction().execute(async trx=>{const lr=await sql<ListingRow>`SELECT * FROM marketplace_listings WHERE id=${id}::uuid FOR UPDATE`.execute(trx);const l=lr.rows[0];if(!l||l.status!=='active'||l.expires_at<=new Date())throw new Error('LISTING_NOT_ACTIVE');if(l.seller_character_id===buyer)throw new Error('SELF_PURCHASE');
 const locked=await trx.selectFrom('characters').select(['id','bank']).where('id','in',[buyer,l.seller_character_id].sort((a,b)=>a-b)).orderBy('id').forUpdate().execute();const b=locked.find(x=>x.id===buyer);const s=locked.find(x=>x.id===l.seller_character_id);if(!b||!s)throw new Error('CHARACTER_NOT_FOUND');if(Number(b.bank)<Number(l.price))throw new Error('INSUFFICIENT_FUNDS');
 if(l.object_type==='vehicle'){const o=await sql`SELECT id FROM vehicles WHERE id=${l.object_id}::uuid AND owner_character_id=${l.seller_character_id} FOR UPDATE`.execute(trx);if(!o.rows.length)throw new Error('OBJECT_NOT_OWNED');await sql`UPDATE vehicles SET owner_character_id=${buyer},locked=TRUE,updated_at=NOW() WHERE id=${l.object_id}::uuid`.execute(trx);}
 else if(l.object_type==='property'){const o=await sql`SELECT id FROM properties WHERE id=${l.object_id}::uuid AND owner_character_id=${l.seller_character_id} FOR UPDATE`.execute(trx);if(!o.rows.length)throw new Error('OBJECT_NOT_OWNED');await sql`UPDATE properties SET owner_character_id=${buyer},updated_at=NOW() WHERE id=${l.object_id}::uuid`.execute(trx);}
 else{const o=await sql`SELECT id FROM businesses WHERE id=${l.object_id}::uuid AND owner_character_id=${l.seller_character_id} FOR UPDATE`.execute(trx);if(!o.rows.length)throw new Error('OBJECT_NOT_OWNED');await sql`UPDATE businesses SET owner_character_id=${buyer},updated_at=NOW() WHERE id=${l.object_id}::uuid`.execute(trx);}
 const cr=await sql<{commission:string;net:string}>`SELECT ROUND(${l.price}::numeric*.05,2)::text commission,ROUND(${l.price}::numeric*.95,2)::text net`.execute(trx);const commission=cr.rows[0]!.commission,net=cr.rows[0]!.net;
 const bu=await trx.updateTable('characters').set({bank:sql<string>`bank-${l.price}::numeric`,updated_at:new Date()}).where('id','=',buyer).returning('bank').executeTakeFirstOrThrow();const su=await trx.updateTable('characters').set({bank:sql<string>`bank+${net}::numeric`,updated_at:new Date()}).where('id','=',l.seller_character_id).returning('bank').executeTakeFirstOrThrow();
 await sql`UPDATE marketplace_listings SET status='sold',buyer_character_id=${buyer},sold_at=NOW() WHERE id=${id}::uuid`.execute(trx);await trx.insertInto('economy_ledger').values({character_id:buyer,family_id:null,source:'marketplace_commission',direction:'sink',amount:commission,metadata:{listingId:id}}).execute();
 return{listing:toView({...l,status:'sold',buyer_character_id:buyer,sold_at:new Date()},buyer),buyerBank:bu.bank,sellerBank:su.bank,commission};
 });
};
