import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const connection=await mysql.createConnection({
 host:process.env.DB_HOST??'127.0.0.1',
 port:Number(process.env.DB_PORT??3306),
 database:process.env.DB_NAME,
 user:process.env.DB_USER,
 password:process.env.DB_PASSWORD,
 charset:'utf8mb4',
 supportBigNumbers:true,
 bigNumberStrings:false
});

const normalizeType=(type)=>({
 varchar:'character varying',char:'character varying',
 decimal:'numeric',int:'integer',
 datetime:'timestamp with time zone',timestamp:'timestamp with time zone',
 json:'jsonb',tinyint:'boolean'
}[type]??type);

const db={
 async query(sql,params=[]){
  if(/FROM\s+pg_indexes/i.test(sql)){
   const [rows]=await connection.execute(
    `SELECT index_name FROM information_schema.statistics WHERE table_schema=DATABASE() AND index_name=? LIMIT 1`,
    ['marketplace_active_object_uq']
   );
   return {rows};
  }
  const ordered=[];
  sql=sql.replace(/\$(\d+)/g,(_,n)=>{ordered.push(params[Number(n)-1]);return '?';});
  sql=sql.replace(/table_schema='public'/gi,'table_schema=DATABASE()');
  sql=sql.replace(/COUNT\(\*\)::int/gi,'COUNT(*)');
  sql=sql.replace(/SELECT\s+key\s+FROM\s+organizations/i,'SELECT `key` FROM organizations');
  const [rows]=await connection.execute(sql,ordered.length?ordered:params);
  return {rows};
 }
};

try{
 const column=async(table,name)=>{const row=(await db.query(`SELECT data_type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`,[table,name])).rows[0];return row?{...row,data_type:normalizeType(row.data_type)}:row;};
 const vehicleId=await column('vehicles','id'),accessVehicleId=await column('vehicle_access','vehicle_id'),marketObjectId=await column('marketplace_listings','object_id'),vehicleTuning=await column('vehicles','tuning');assert.equal(vehicleId?.data_type,'bigint');assert.equal(accessVehicleId?.data_type,'bigint');assert.equal(marketObjectId?.data_type,'character varying');assert.equal(vehicleTuning?.data_type,'jsonb');
 const marketType=await column('marketplace_listings','listing_type'),marketBid=await column('marketplace_listings','current_bid'),marketQty=await column('marketplace_listings','quantity'),escrow=await column('marketplace_item_escrow','item_key'),bidAmount=await column('marketplace_bids','amount'),historyAmount=await column('marketplace_history','amount');assert.equal(marketType?.data_type,'character varying');assert.equal(marketBid?.data_type,'numeric');assert.equal(marketQty?.data_type,'integer');assert.equal(escrow?.data_type,'character varying');assert.equal(bidAmount?.data_type,'numeric');assert.equal(historyAmount?.data_type,'numeric');
 const phoneCallStatus=await column('phone_calls','status'),phoneCallEnded=await column('phone_calls','ended_at'),classifiedCategory=await column('phone_classifieds','category'),classifiedExpiry=await column('phone_classifieds','expires_at');assert.equal(phoneCallStatus?.data_type,'character varying');assert.equal(phoneCallEnded?.data_type,'timestamp with time zone');assert.equal(classifiedCategory?.data_type,'character varying');assert.equal(classifiedExpiry?.data_type,'timestamp with time zone');
 const craftingReady=await column('crafting_orders','ready_at'),craftingBatches=await column('crafting_orders','batches'),recipeDuration=await column('crafting_recipes','duration_seconds');assert.equal(craftingReady?.data_type,'timestamp with time zone');assert.equal(craftingBatches?.data_type,'integer');assert.equal(recipeDuration?.data_type,'integer');const stations=await db.query('SELECT COUNT(*) count FROM crafting_stations WHERE enabled=1'),recipes=await db.query('SELECT COUNT(*) count FROM crafting_recipes WHERE enabled=1'),inputs=await db.query('SELECT COUNT(*) count FROM crafting_recipe_inputs');assert.ok(stations.rows[0].count>=4);assert.ok(recipes.rows[0].count>=5);assert.ok(inputs.rows[0].count>=9);
 const weaponAmmo=await column('character_weapons','ammo'),weaponPrice=await column('weapon_shop_products','price');assert.equal(weaponAmmo?.data_type,'integer');assert.equal(weaponPrice?.data_type,'numeric');const weaponShops=await db.query('SELECT COUNT(*) count FROM weapon_shops WHERE enabled=1'),weaponDefs=await db.query('SELECT COUNT(*) count FROM weapon_definitions'),weaponProducts=await db.query('SELECT COUNT(*) count FROM weapon_shop_products WHERE enabled=1');assert.ok(weaponShops.rows[0].count>=2);assert.ok(weaponDefs.rows[0].count>=3);assert.ok(weaponProducts.rows[0].count>=14);
 const casinoChips=await column('casino_wallets','chips'),casinoResult=await column('casino_game_history','result'),activityKind=await column('activity_definitions','kind'),activityBest=await column('character_activity_progress','best_score');assert.equal(casinoChips?.data_type,'bigint');assert.equal(casinoResult?.data_type,'jsonb');assert.equal(activityKind?.data_type,'character varying');assert.equal(activityBest?.data_type,'integer');const activityDefs=await db.query('SELECT COUNT(*) count FROM activity_definitions WHERE enabled=1');assert.ok(activityDefs.rows[0].count>=3);
 const service=await db.query("SELECT COUNT(*) count FROM businesses WHERE kind='service'");assert.ok(service.rows[0].count>=1);const dealers=await db.query('SELECT COUNT(*) count FROM dealerships'),offers=await db.query('SELECT COUNT(*) count FROM dealership_offers WHERE enabled=1');assert.ok(dealers.rows[0].count>=1);assert.ok(offers.rows[0].count>=1);const index=await db.query("SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='marketplace_active_object_uq'");assert.equal(index.rows.length,1);
 const docs=await column('character_documents','licenses');assert.equal(docs?.data_type,'jsonb');const factions=await db.query('SELECT COUNT(*) count FROM criminal_factions'),territories=await db.query('SELECT COUNT(*) count FROM criminal_territories'),ranks=await db.query('SELECT COUNT(*) count FROM criminal_faction_ranks');assert.ok(factions.rows[0].count>=4);assert.ok(territories.rows[0].count>=5);assert.ok(ranks.rows[0].count>=16);
 const orgs=await db.query("SELECT `key` FROM organizations WHERE `key` IN ('lspd','ems','gov')");assert.equal(orgs.rows.length,3);const orgFleet=await db.query('SELECT COUNT(*) count FROM organization_vehicles'),orgUniforms=await db.query('SELECT COUNT(*) count FROM organization_uniforms'),orgStorage=await db.query("SELECT COUNT(*) count FROM inventories WHERE owner_type='organization'");assert.ok(orgFleet.rows[0].count>=5);assert.ok(orgUniforms.rows[0].count>=5);assert.ok(orgStorage.rows[0].count>=3);
 const familyUpgrade=await column('family_upgrades','level'),familyContracts=await column('family_contracts','progress');assert.equal(familyUpgrade?.data_type,'smallint');assert.equal(familyContracts?.data_type,'integer');const custodyRestrained=await column('police_custody','restrained'),custodyJailed=await column('police_custody','jailed_until');assert.equal(custodyRestrained?.data_type,'boolean');assert.equal(custodyJailed?.data_type,'timestamp with time zone');const medicalDowned=await column('character_medical_state','downed'),medicalBleedout=await column('character_medical_state','bleedout_at'),medicalHospital=await column('character_medical_state','hospitalized_until');assert.equal(medicalDowned?.data_type,'boolean');assert.equal(medicalBleedout?.data_type,'timestamp with time zone');assert.equal(medicalHospital?.data_type,'timestamp with time zone');
 const propertyTax=await column('properties','tax_paid_until'),propertyRent=await column('properties','rent_enabled'),propertyGarage=await column('properties','garage_slots');assert.equal(propertyTax?.data_type,'timestamp with time zone');assert.equal(propertyRent?.data_type,'boolean');assert.equal(propertyGarage?.data_type,'integer');const storageOwner=await column('property_storage_owners','storage_owner_id'),tenant=await column('property_tenants','rent_paid_until'),furniture=await column('property_furniture','model'),garageVehicle=await column('property_garage_vehicles','vehicle_id');assert.equal(storageOwner?.data_type,'bigint');assert.equal(tenant?.data_type,'timestamp with time zone');assert.equal(furniture?.data_type,'character varying');assert.equal(garageVehicle?.data_type,'bigint');
 const businessRole=await column('business_employees','role'),businessSalary=await column('business_employees','salary'),businessUpgrade=await column('business_upgrades','level'),businessAudit=await column('business_audit_log','metadata');assert.equal(businessRole?.data_type,'character varying');assert.equal(businessSalary?.data_type,'numeric');assert.equal(businessUpgrade?.data_type,'smallint');assert.equal(businessAudit?.data_type,'jsonb');const upgradeSeeds=await db.query('SELECT COUNT(*) count FROM business_upgrades');const businessCount=await db.query('SELECT COUNT(*) count FROM businesses');assert.equal(upgradeSeeds.rows[0].count,businessCount.rows[0].count*3);
 const outfit=await column('character_outfit_state','components');assert.equal(outfit?.data_type,'jsonb');const clothingShops=await db.query("SELECT COUNT(*) count FROM customization_shops WHERE kind='clothing'"),catalog=await db.query('SELECT COUNT(*) count FROM clothing_catalog WHERE enabled=1');assert.ok(clothingShops.rows[0].count>=2);assert.ok(catalog.rows[0].count>=12);const barberShops=await db.query("SELECT COUNT(*) count FROM customization_shops WHERE kind='barber'"),tattooShops=await db.query("SELECT COUNT(*) count FROM customization_shops WHERE kind='tattoo'"),barber=await db.query('SELECT COUNT(*) count FROM barber_catalog WHERE enabled=1'),tattoo=await db.query('SELECT COUNT(*) count FROM tattoo_catalog WHERE enabled=1');assert.ok(barberShops.rows[0].count>=1);assert.ok(tattooShops.rows[0].count>=1);assert.ok(barber.rows[0].count>=10);assert.ok(tattoo.rows[0].count>=4);const tattooKey=await column('character_tattoos','tattoo_key');assert.equal(tattooKey?.data_type,'character varying');
 console.log('[schema-regression:mysql] OK: core systems + marketplace + phone + crafting + weapons + casino activities');
}finally{await connection.end();}
