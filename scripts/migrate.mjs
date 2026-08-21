#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { mysqlize } from './mysql-compat.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'database','migrations');
const required=(key)=>{const value=process.env[key];if(!value){console.error(`[migrate] Отсутствует переменная окружения ${key}`);process.exit(1);}return value;};
const connection=await mysql.createConnection({host:process.env.DB_HOST??'127.0.0.1',port:Number.parseInt(process.env.DB_PORT??'3306',10),database:required('DB_NAME'),user:required('DB_USER'),password:required('DB_PASSWORD'),charset:'utf8mb4',multipleStatements:true,supportBigNumbers:true,bigNumberStrings:true});
await connection.query("SET time_zone = '+00:00'");
await connection.query(`CREATE TABLE IF NOT EXISTS _migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
const [rows]=await connection.query('SELECT name FROM _migrations');
const applied=new Set(rows.map((r)=>r.name));
const files=readdirSync(dir).filter((f)=>f.endsWith('.sql')).sort();
let count=0;
for(const file of files){if(applied.has(file))continue;const source=readFileSync(join(dir,file),'utf8');const sql=mysqlize(source,file);process.stdout.write(`[migrate:mysql] применяю ${file} ... `);try{await connection.beginTransaction();if(sql.trim())await connection.query(sql);await connection.execute('INSERT INTO _migrations(name) VALUES (?)',[file]);await connection.commit();console.log('готово');count+=1;}catch(error){try{await connection.rollback();}catch{}console.log('ОШИБКА');console.error(`[migrate:mysql] ${file}`,error);await connection.end();process.exit(1);}}
console.log(count===0?'[migrate:mysql] новых миграций нет':`[migrate:mysql] применено миграций: ${count}`);
await connection.end();
