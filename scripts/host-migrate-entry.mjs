import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { mysqlize } from './mysql-compat.mjs';
import { applyMysqlOverride } from './mysql-overrides.mjs';
const dir=join(process.cwd(),'database','migrations');
const req=k=>{const v=process.env[k];if(!v)throw new Error(`[migrate:mysql] missing ${k}`);return v;};
const main=async()=>{const client=await mysql.createConnection({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:req('DB_NAME'),user:req('DB_USER'),password:req('DB_PASSWORD'),charset:'utf8mb4',multipleStatements:true,supportBigNumbers:true,bigNumberStrings:true});try{await client.query("SET time_zone = '+00:00'");await client.query('CREATE TABLE IF NOT EXISTS _migrations(name VARCHAR(255) PRIMARY KEY,applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');const [rows]=await client.query('SELECT name FROM _migrations');const applied=new Set(rows.map(r=>r.name));for(const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()){if(applied.has(file))continue;const sql=applyMysqlOverride(file,mysqlize(readFileSync(join(dir,file),'utf8'),file));process.stdout.write(`[migrate:mysql] ${file} ... `);try{await client.beginTransaction();if(sql.trim())await client.query(sql);await client.execute('INSERT INTO _migrations(name) VALUES(?)',[file]);await client.commit();console.log('ok');}catch(e){try{await client.rollback();}catch{}throw e;}}console.log('[migrate:mysql] database ready');}finally{await client.end();}};
main().catch(e=>{console.error('[migrate:mysql] failed',e);process.exitCode=1;});
