import assert from 'node:assert/strict';
import pg from 'pg';

const config={host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD};
const first=new pg.Client(config);await first.connect();
let accountId,characterId,familyId,orgId,propertyId;
try{
 await first.query('TRUNCATE operation_receipts, active_job_assignments, characters, accounts RESTART IDENTITY CASCADE');
 const account=(await first.query("INSERT INTO accounts(login,login_lower,email,password_hash) VALUES('recovery','recovery','recovery@example.com','x') RETURNING id")).rows[0];accountId=account.id;
 const ch=(await first.query("INSERT INTO characters(account_id,slot,first_name,last_name,name_lower,gender,cash,bank,position_x,position_y,position_z,dimension) VALUES($1,0,'Recover','Test','recover test','male',1000,5000,123.25,456.5,78.75,12) RETURNING id",[accountId])).rows[0];characterId=ch.id;
 const fam=(await first.query("INSERT INTO families(name,name_lower,owner_character_id) VALUES('Recovery Family','recovery family',$1) RETURNING id",[characterId])).rows[0];familyId=fam.id;
 const rank=(await first.query("INSERT INTO family_ranks(family_id,rank_index,name) VALUES($1,10,'Owner') RETURNING id",[familyId])).rows[0];
 await first.query('INSERT INTO family_members(family_id,character_id,rank_id) VALUES($1,$2,$3)',[familyId,characterId,rank.id]);
 const org=(await first.query("SELECT id FROM organizations ORDER BY created_at LIMIT 1")).rows[0];orgId=org.id;
 const orgRank=(await first.query('SELECT id FROM organization_ranks WHERE organization_id=$1 ORDER BY rank_index DESC LIMIT 1',[orgId])).rows[0];
 await first.query('INSERT INTO organization_members(organization_id,character_id,rank_id,on_duty) VALUES($1,$2,$3,TRUE)',[orgId,characterId,orgRank.id]);
 const prop=(await first.query("SELECT id FROM properties WHERE owner_character_id IS NULL LIMIT 1")).rows[0];propertyId=prop.id;
 await first.query('UPDATE properties SET owner_character_id=$1,tax_paid_until=NOW()+INTERVAL \'7 days\' WHERE id=$2',[characterId,propertyId]);
 await first.query("INSERT INTO active_job_assignments(character_id,job_key,step_index,state,issued_at) VALUES($1,'trucker',2,$2::jsonb,NOW()-INTERVAL '30 seconds')",[characterId,JSON.stringify({payoutCash:'2100.00',routeSeed:'recovery-test',currentAction:'Разгрузите груз'})]);
 await first.query("INSERT INTO operation_receipts(character_id,scope,operation_key,result) VALUES($1,'marketplace.buy','restart-op-1',$2::jsonb)",[characterId,JSON.stringify({listingId:'test',status:'committed'})]);
}finally{await first.end();}

// Эмулируем новый процесс после restart: новое физическое соединение и никаких данных из памяти Node.js.
const second=new pg.Client(config);await second.connect();
try{
 const ch=(await second.query('SELECT position_x,position_y,position_z,dimension,cash,bank FROM characters WHERE id=$1',[characterId])).rows[0];
 assert.equal(Number(ch.position_x),123.25);assert.equal(Number(ch.position_y),456.5);assert.equal(Number(ch.position_z),78.75);assert.equal(ch.dimension,12);assert.equal(Number(ch.cash),1000);assert.equal(Number(ch.bank),5000);
 const job=(await second.query('SELECT job_key,step_index,state FROM active_job_assignments WHERE character_id=$1',[characterId])).rows[0];assert.equal(job.job_key,'trucker');assert.equal(job.step_index,2);assert.equal(job.state.currentAction,'Разгрузите груз');
 const family=(await second.query('SELECT family_id FROM family_members WHERE character_id=$1',[characterId])).rows[0];assert.equal(family.family_id,familyId);
 const org=(await second.query('SELECT organization_id,on_duty FROM organization_members WHERE character_id=$1',[characterId])).rows[0];assert.equal(org.organization_id,orgId);assert.equal(org.on_duty,true);
 const property=(await second.query('SELECT owner_character_id,tax_paid_until FROM properties WHERE id=$1',[propertyId])).rows[0];assert.equal(property.owner_character_id,characterId);assert.ok(property.tax_paid_until);
 const receipt=(await second.query("SELECT result FROM operation_receipts WHERE scope='marketplace.buy' AND operation_key='restart-op-1'")).rows[0];assert.equal(receipt.result.status,'committed');
 let duplicateRejected=false;try{await second.query("INSERT INTO operation_receipts(character_id,scope,operation_key) VALUES($1,'marketplace.buy','restart-op-1')",[characterId]);}catch(e){duplicateRejected=e?.code==='23505';}assert.equal(duplicateRejected,true,'operation receipt must stay unique across restart');
 console.log('[restart-recovery] OK: character + job + family + organization + property + operation receipt survive a fresh process connection');
}finally{await second.end();}
