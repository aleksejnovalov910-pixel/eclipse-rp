import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const here=dirname(fileURLToPath(import.meta.url));const dir=join(here,'..','database','migrations');
const req=k=>{const v=process.env[k];if(!v)throw new Error(`[migrate] missing ${k}`);return v;};
const client=new pg.Client({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??5432),database:req('DB_NAME'),user:req('DB_USER'),password:req('DB_PASSWORD')});
await client.connect();await client.query('CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');const rows=(await client.query('SELECT name FROM _migrations')).rows;const applied=new Set(rows.map(r=>r.name));
for(const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()){if(applied.has(file))continue;const sql=readFileSync(join(dir,file),'utf8');process.stdout.write(`[migrate] ${file} ... `);try{await client.query('BEGIN');await client.query(sql);await client.query('INSERT INTO _migrations(name) VALUES($1)',[file]);await client.query('COMMIT');console.log('ok');}catch(e){await client.query('ROLLBACK');throw e;}}
await client.end();console.log('[migrate] database ready');
