import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';

const pool=new pg.Pool({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,max:32});
const db=await pool.connect();
try{
  await db.query('TRUNCATE progression_claims,battle_pass_claims,marketplace_listings,characters,accounts RESTART IDENTITY CASCADE');
  const a=await db.query("INSERT INTO accounts(login,login_lower,email,password_hash) VALUES('abuse_test','abuse_test','abuse@test.local','x') RETURNING id");
  const accountId=a.rows[0].id;
  const c=await db.query("INSERT INTO characters(account_id,slot,first_name,last_name,name_lower,gender,bank,cash) VALUES($1,0,'Abuse','Test','abuse test','male',100,100) RETURNING id",[accountId]);
  const characterId=c.rows[0].id;

  const debits=await Promise.all(Array.from({length:25},()=>pool.query('UPDATE characters SET bank=bank-10 WHERE id=$1 AND bank>=10 RETURNING bank',[characterId])));
  assert.equal(debits.reduce((n,r)=>n+(r.rowCount??0),0),10,'guarded concurrent debits must succeed exactly ten times');
  const balance=await pool.query('SELECT bank::numeric AS bank FROM characters WHERE id=$1',[characterId]);
  assert.equal(Number(balance.rows[0].bank),0,'bank must never go negative under contention');

  await assert.rejects(()=>pool.query('UPDATE characters SET cash=-1 WHERE id=$1',[characterId]),/characters_money_non_negative|check constraint/i);

  const claims=await Promise.allSettled(Array.from({length:20},()=>pool.query("INSERT INTO progression_claims(character_id,claim_key) VALUES($1,'same_reward')",[characterId])));
  assert.equal(claims.filter(x=>x.status==='fulfilled').length,1,'a reward claim must be insertable only once');

  const bp=await Promise.allSettled(Array.from({length:20},()=>pool.query("INSERT INTO battle_pass_claims(character_id,season_key,tier) VALUES($1,'season_test',1)",[characterId])));
  assert.equal(bp.filter(x=>x.status==='fulfilled').length,1,'a battle-pass tier must be claimable only once');

  const listings=await Promise.allSettled(Array.from({length:12},()=>pool.query("INSERT INTO marketplace_listings(seller_character_id,object_type,object_id,title,price,status) VALUES($1,'vehicle','anti-dupe-object','Anti Dupe',100,'active')",[characterId])));
  assert.equal(listings.filter(x=>x.status==='fulfilled').length,1,'only one active listing may reserve the same object');

  const rpc=fs.readFileSync(new URL('../packages/server/src/core/rpc.ts',import.meta.url),'utf8');
  assert.match(rpc,/const replay=new Map/,'RPC replay cache must exist');
  assert.match(rpc,/replayKey\(session,event,requestId\)/,'RPC replay key must include session/event/requestId');
  assert.match(rpc,/MAX_PAYLOAD/,'RPC payload limit must exist');
  assert.match(rpc,/MAX_REQUEST_ID/,'RPC request-id limit must exist');

  console.log('[anti-abuse-regression] OK: guarded balances, unique claims, marketplace reservation, RPC idempotency');
}finally{db.release();await pool.end();}
