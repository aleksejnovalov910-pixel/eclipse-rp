import assert from 'node:assert/strict';
import pg from 'pg';
const config={host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD};
const admin=new pg.Client(config);await admin.connect();
let sellerId,buyerA,buyerB,listingId,itemId,businessId;
try{
 await admin.query('TRUNCATE marketplace_history, marketplace_bids, marketplace_item_escrow, marketplace_listings, inventory_items, inventories, characters, accounts RESTART IDENTITY CASCADE');
 const mk=async(login,first)=>{const a=(await admin.query('INSERT INTO accounts(login,login_lower,email,password_hash) VALUES($1,$1,$2,\'x\') RETURNING id',[login,`${login}@race.test`])).rows[0];return (await admin.query("INSERT INTO characters(account_id,slot,first_name,last_name,name_lower,gender,cash,bank) VALUES($1,0,$2,'Race',LOWER($2||' race'),'male',1000,100000) RETURNING id",[a.id,first])).rows[0].id;};
 sellerId=await mk('race_seller','Seller');buyerA=await mk('race_a','BuyerA');buyerB=await mk('race_b','BuyerB');
 listingId=(await admin.query("INSERT INTO marketplace_listings(seller_character_id,object_type,object_id,title,price,status,listing_type) VALUES($1,'item','race-object','Race Listing',5000,'active','fixed') RETURNING id",[sellerId])).rows[0].id;
 const inv=(await admin.query("INSERT INTO inventories(owner_type,owner_id,capacity_weight,slots) VALUES('business','999991',1000,50) RETURNING id")).rows[0];
 itemId=(await admin.query("INSERT INTO inventory_items(inventory_id,item_key,slot,quantity) VALUES($1,'water',0,10) RETURNING id",[inv.id])).rows[0].id;
 businessId=(await admin.query("INSERT INTO businesses(kind,name,price,owner_character_id,position_x,position_y,position_z) VALUES('shop','Race Business',50000,NULL,0,0,0) RETURNING id")).rows[0].id;
}finally{await admin.end();}
const clients=await Promise.all([0,1,2,3,4,5].map(async()=>{const c=new pg.Client(config);await c.connect();return c;}));
try{
 const buy=async(c,buyer)=>{await c.query('BEGIN');try{const row=(await c.query('SELECT status FROM marketplace_listings WHERE id=$1 FOR UPDATE',[listingId])).rows[0];if(row?.status!=='active'){await c.query('ROLLBACK');return false;}const charged=await c.query('UPDATE characters SET bank=bank-5000 WHERE id=$1 AND bank>=5000 RETURNING id',[buyer]);if(!charged.rowCount){await c.query('ROLLBACK');return false;}const sold=await c.query("UPDATE marketplace_listings SET status='sold',buyer_character_id=$2,sold_at=NOW() WHERE id=$1 AND status='active' RETURNING id",[listingId,buyer]);if(!sold.rowCount){await c.query('ROLLBACK');return false;}await c.query('UPDATE characters SET bank=bank+5000 WHERE id=$1',[sellerId]);await c.query('COMMIT');return true;}catch(e){await c.query('ROLLBACK');throw e;}};
 const market=await Promise.all([buy(clients[0],buyerA),buy(clients[1],buyerB)]);assert.equal(market.filter(Boolean).length,1,'one marketplace listing must have exactly one buyer');
 const sold=(await clients[0].query('SELECT status,buyer_character_id FROM marketplace_listings WHERE id=$1',[listingId])).rows[0];assert.equal(sold.status,'sold');assert.ok([buyerA,buyerB].includes(sold.buyer_character_id));
 const balances=await clients[0].query('SELECT id,bank FROM characters WHERE id=ANY($1::bigint[]) ORDER BY id',[[sellerId,buyerA,buyerB]]);const total=balances.rows.reduce((n,r)=>n+Number(r.bank),0);assert.equal(total,300000,'market race must conserve total bank money');

 const take=async(c)=>{const r=await c.query('UPDATE inventory_items SET quantity=quantity-7,updated_at=NOW() WHERE id=$1 AND quantity>=7 RETURNING quantity',[itemId]);return r.rowCount===1;};
 const storage=await Promise.all([take(clients[2]),take(clients[3])]);assert.equal(storage.filter(Boolean).length,1,'only one player may take an overlapping warehouse quantity');const qty=(await clients[2].query('SELECT quantity FROM inventory_items WHERE id=$1',[itemId])).rows[0].quantity;assert.equal(qty,3,'warehouse quantity must remain consistent after race');

 const acquire=async(c,buyer)=>{const r=await c.query('UPDATE businesses SET owner_character_id=$2,updated_at=NOW() WHERE id=$1 AND owner_character_id IS NULL RETURNING owner_character_id',[businessId,buyer]);return r.rows[0]?.owner_character_id??null;};
 const owners=await Promise.all([acquire(clients[4],buyerA),acquire(clients[5],buyerB)]);assert.equal(owners.filter(Boolean).length,1,'only one player may acquire one free business');const owner=(await clients[0].query('SELECT owner_character_id FROM businesses WHERE id=$1',[businessId])).rows[0].owner_character_id;assert.ok([buyerA,buyerB].includes(owner));
 console.log('[multiplayer-concurrency] OK: single market buyer + guarded warehouse quantity + single business owner');
}finally{await Promise.all(clients.map(c=>c.end()));}
