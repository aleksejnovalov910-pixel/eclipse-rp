import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const config={host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,charset:'utf8mb4'};
const first=await mysql.createConnection(config);
let accountId,characterId,familyId,orgId,propertyId;
const jobSteps=[{x:1204.6,y:-3104.2,z:5.9,action:'Загрузите трейлер',durationMs:3500,vehicle:true},{x:2568.2,y:468.7,z:108.5,action:'Контрольная точка',durationMs:1500,vehicle:true},{x:1704.8,y:4917.5,z:42.1,action:'Разгрузите груз',durationMs:4000,vehicle:true}];
const json=(value)=>typeof value==='string'?JSON.parse(value):value;
try{
 await first.query('SET FOREIGN_KEY_CHECKS=0');
 for(const table of ['operation_receipts','active_job_assignments','family_members','family_ranks','families','organization_members','properties','characters','accounts']) await first.query(`TRUNCATE TABLE ${table}`);
 await first.query('SET FOREIGN_KEY_CHECKS=1');
 const [account]=await first.execute("INSERT INTO accounts(login,login_lower,email,password_hash) VALUES('recovery','recovery','recovery@example.com','x')");accountId=account.insertId;
 const [ch]=await first.execute("INSERT INTO characters(account_id,slot,first_name,last_name,name_lower,gender,cash,bank,position_x,position_y,position_z,dimension) VALUES(?,0,'Recover','Test','recover test','male',1000,5000,123.25,456.5,78.75,12)",[accountId]);characterId=ch.insertId;
 const [fam]=await first.execute("INSERT INTO families(name,name_lower,owner_character_id) VALUES('Recovery Family','recovery family',?)",[characterId]);familyId=fam.insertId;
 const [rank]=await first.execute("INSERT INTO family_ranks(family_id,rank_index,name) VALUES(?,10,'Owner')",[familyId]);
 await first.execute('INSERT INTO family_members(family_id,character_id,rank_id) VALUES(?,?,?)',[familyId,characterId,rank.insertId]);
 const [orgRows]=await first.query('SELECT id FROM organizations ORDER BY created_at LIMIT 1');orgId=orgRows[0].id;
 const [orgRankRows]=await first.execute('SELECT id FROM organization_ranks WHERE organization_id=? ORDER BY rank_index DESC LIMIT 1',[orgId]);
 await first.execute('INSERT INTO organization_members(organization_id,character_id,rank_id,on_duty) VALUES(?,?,?,1)',[orgId,characterId,orgRankRows[0].id]);
 const [prop]=await first.execute("INSERT INTO properties(kind,name,price,owner_character_id,exterior_x,exterior_y,exterior_z,exterior_heading,exterior_dimension,interior_x,interior_y,interior_z,interior_heading,instance_dimension,tax_paid_until) VALUES('house','Recovery House',100000,?,10,20,30,0,0,100,200,300,0,19991,DATE_ADD(CURRENT_TIMESTAMP(3),INTERVAL 7 DAY))",[characterId]);propertyId=prop.insertId;
 await first.execute("INSERT INTO active_job_assignments(character_id,job_key,step_index,state,issued_at) VALUES(?,'trucker',2,?,DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 30 SECOND))",[characterId,JSON.stringify({payoutCash:'2100.00',steps:jobSteps})]);
 await first.execute("INSERT INTO operation_receipts(character_id,scope,operation_key,result) VALUES(?,'marketplace.buy','restart-op-1',?)",[characterId,JSON.stringify({listingId:'test',status:'committed'})]);
}finally{await first.end();}

const second=await mysql.createConnection(config);
try{
 const [chRows]=await second.execute('SELECT position_x,position_y,position_z,dimension,cash,bank FROM characters WHERE id=?',[characterId]);const ch=chRows[0];
 assert.equal(Number(ch.position_x),123.25);assert.equal(Number(ch.position_y),456.5);assert.equal(Number(ch.position_z),78.75);assert.equal(ch.dimension,12);assert.equal(Number(ch.cash),1000);assert.equal(Number(ch.bank),5000);
 const [jobRows]=await second.execute('SELECT job_key,step_index,state,issued_at FROM active_job_assignments WHERE character_id=?',[characterId]);const job=jobRows[0];const state=json(job.state);assert.equal(job.job_key,'trucker');assert.equal(job.step_index,2);assert.equal(state.payoutCash,'2100.00');assert.equal(state.steps.length,3);assert.equal(state.steps[2].action,'Разгрузите груз');assert.ok(job.issued_at);
 const [familyRows]=await second.execute('SELECT family_id FROM family_members WHERE character_id=?',[characterId]);assert.equal(String(familyRows[0].family_id),String(familyId));
 const [orgRows]=await second.execute('SELECT organization_id,on_duty FROM organization_members WHERE character_id=?',[characterId]);assert.equal(String(orgRows[0].organization_id),String(orgId));assert.equal(Number(orgRows[0].on_duty),1);
 const [propertyRows]=await second.execute('SELECT owner_character_id,tax_paid_until FROM properties WHERE id=?',[propertyId]);assert.equal(String(propertyRows[0].owner_character_id),String(characterId));assert.ok(propertyRows[0].tax_paid_until);
 const [receiptRows]=await second.execute("SELECT result FROM operation_receipts WHERE scope='marketplace.buy' AND operation_key='restart-op-1'");assert.equal(json(receiptRows[0].result).status,'committed');
 let duplicateRejected=false;try{await second.execute("INSERT INTO operation_receipts(character_id,scope,operation_key) VALUES(?,'marketplace.buy','restart-op-1')",[characterId]);}catch(e){duplicateRejected=e?.code==='ER_DUP_ENTRY';}assert.equal(duplicateRejected,true,'operation receipt must stay unique across restart');
 console.log('[restart-recovery:mysql] OK: character + job + family + organization + property + receipt survive a fresh connection');
}finally{await second.end();}
