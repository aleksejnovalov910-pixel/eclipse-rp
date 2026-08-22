import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
const config={host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,charset:'utf8mb4'};
const admin=await mysql.createConnection(config);
let sellerId,buyerA,buyerB,listingId,businessId;const warehouseItems={};
try{
 await admin.query('SET FOREIGN_KEY_CHECKS=0');
 for(const table of ['marketplace_history','marketplace_bids','marketplace_item_escrow','marketplace_listings','inventory_items','inventories','characters','accounts']) await admin.query(`TRUNCATE TABLE ${table}`);
 await admin.query('SET FOREIGN_KEY_CHECKS=1');
 await admin.execute("INSERT INTO item_definitions(`key`,name,category,weight,stack_size,tradable,droppable,metadata) VALUES('race_item','Race Item','misc',1,100,1,1,JSON_OBJECT()) ON DUPLICATE KEY UPDATE name=VALUES(name)");
 const mk=async(login,first)=>{const [a]=await admin.execute("INSERT INTO accounts(login,login_lower,email,password_hash) VALUES(?,?,?,'x')",[login,login,`${login}@race.test`]);const lower=`${first} race`.toLowerCase();const [c]=await admin.execute("INSERT INTO characters(account_id,slot,first_name,last_name,name_lower,gender,cash,bank) VALUES(?,0,?,'Race',?,'male',1000,100000)",[a.insertId,first,lower]);return c.insertId;};
 sellerId=await mk('race_seller','Seller');buyerA=await mk('race_a','BuyerA');buyerB=await mk('race_b','BuyerB');
 const [listing]=await admin.execute("INSERT INTO marketplace_listings(seller_character_id,object_type,object_id,title,price,status,listing_type) VALUES(?,'item','race-object','Race Listing',5000,'active','fixed')",[sellerId]);listingId=listing.insertId;
 for(const [ownerType,ownerId] of [['business','999991'],['family','999992'],['organization','999993']]){const [inv]=await admin.execute('INSERT INTO inventories(owner_type,owner_id,capacity_weight,slots) VALUES(?,?,1000,50)',[ownerType,ownerId]);const [item]=await admin.execute("INSERT INTO inventory_items(inventory_id,item_key,slot,quantity) VALUES(?,'race_item',0,10)",[inv.insertId]);warehouseItems[ownerType]=item.insertId;}
 const [business]=await admin.execute("INSERT INTO businesses(kind,name,price,owner_character_id,position_x,position_y,position_z) VALUES('shop','Race Business',50000,NULL,0,0,0)");businessId=business.insertId;
}finally{await admin.end();}
const clients=await Promise.all([0,1,2,3,4,5].map(()=>mysql.createConnection(config)));
try{
 const buy=async(c,buyer)=>{await c.beginTransaction();try{const [rows]=await c.execute('SELECT status FROM marketplace_listings WHERE id=? FOR UPDATE',[listingId]);if(rows[0]?.status!=='active'){await c.rollback();return false;}const [charged]=await c.execute('UPDATE characters SET bank=bank-5000 WHERE id=? AND bank>=5000',[buyer]);if(!charged.affectedRows){await c.rollback();return false;}const [sold]=await c.execute("UPDATE marketplace_listings SET status='sold',buyer_character_id=?,sold_at=CURRENT_TIMESTAMP(3) WHERE id=? AND status='active'",[buyer,listingId]);if(!sold.affectedRows){await c.rollback();return false;}await c.execute('UPDATE characters SET bank=bank+5000 WHERE id=?',[sellerId]);await c.commit();return true;}catch(e){await c.rollback();throw e;}};
 const market=await Promise.all([buy(clients[0],buyerA),buy(clients[1],buyerB)]);assert.equal(market.filter(Boolean).length,1,'one marketplace listing must have exactly one buyer');
 const [soldRows]=await clients[0].execute('SELECT status,buyer_character_id FROM marketplace_listings WHERE id=?',[listingId]);const sold=soldRows[0];assert.equal(sold.status,'sold');assert.ok([String(buyerA),String(buyerB)].includes(String(sold.buyer_character_id)));
 const [balances]=await clients[0].execute('SELECT id,bank FROM characters WHERE id IN (?,?,?) ORDER BY id',[sellerId,buyerA,buyerB]);const total=balances.reduce((n,r)=>n+Number(r.bank),0);assert.equal(total,300000,'market race must conserve total bank money');

 const take=async(c,itemId)=>{const [r]=await c.execute('UPDATE inventory_items SET quantity=quantity-7,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND quantity>=7',[itemId]);return r.affectedRows===1;};
 for(const ownerType of ['business','family','organization']){const itemId=warehouseItems[ownerType];const storage=await Promise.all([take(clients[2],itemId),take(clients[3],itemId)]);assert.equal(storage.filter(Boolean).length,1,`${ownerType} storage must have exactly one overlapping withdrawal winner`);const [qtyRows]=await clients[2].execute('SELECT quantity FROM inventory_items WHERE id=?',[itemId]);assert.equal(Number(qtyRows[0].quantity),3,`${ownerType} storage quantity must remain consistent after race`);}

 const acquire=async(c,buyer)=>{const [r]=await c.execute('UPDATE businesses SET owner_character_id=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND owner_character_id IS NULL',[buyer,businessId]);return r.affectedRows===1?buyer:null;};
 const owners=await Promise.all([acquire(clients[4],buyerA),acquire(clients[5],buyerB)]);assert.equal(owners.filter(Boolean).length,1,'only one player may acquire one free business');const [ownerRows]=await clients[0].execute('SELECT owner_character_id FROM businesses WHERE id=?',[businessId]);const owner=ownerRows[0].owner_character_id;assert.ok([String(buyerA),String(buyerB)].includes(String(owner)));
 console.log('[multiplayer-concurrency:mysql] OK: single market buyer + guarded storage + single business owner');
}finally{await Promise.all(clients.map(c=>c.end()));}
