import assert from 'node:assert/strict';
import pg from 'pg';

const db=new pg.Client({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
await db.connect();
try{
 const column=async(table,name)=>(await db.query(`SELECT data_type,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,[table,name])).rows[0];
 const vehicleId=await column('vehicles','id');
 const accessVehicleId=await column('vehicle_access','vehicle_id');
 const marketObjectId=await column('marketplace_listings','object_id');
 assert.equal(vehicleId?.data_type,'bigint','vehicles.id must stay BIGINT');
 assert.equal(accessVehicleId?.data_type,'bigint','vehicle_access.vehicle_id must match vehicles.id');
 assert.equal(marketObjectId?.data_type,'character varying','marketplace object_id must support bigint vehicles and UUID world objects');
 const service=await db.query("SELECT COUNT(*)::int count FROM businesses WHERE kind='service'");
 assert.ok(service.rows[0].count>=1,'service business seed missing');
 const dealers=await db.query('SELECT COUNT(*)::int count FROM dealerships');
 const offers=await db.query('SELECT COUNT(*)::int count FROM dealership_offers WHERE enabled=TRUE');
 assert.ok(dealers.rows[0].count>=1,'dealership seed missing');
 assert.ok(offers.rows[0].count>=1,'dealership offers missing');
 const index=await db.query("SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='marketplace_active_object_uq'");
 assert.ok(index.rows.length===1,'marketplace active-object unique index missing');
 console.log('[schema-regression] OK: vehicle ids, market ids, services and dealerships');
}finally{await db.end();}
