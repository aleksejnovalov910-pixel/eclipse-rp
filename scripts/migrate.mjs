#!/usr/bin/env node
/**
 * Раннер миграций ECLIPSE.
 *
 * Правила:
 *   * миграции применяются строго по возрастанию имени файла;
 *   * каждая выполняется в одной транзакции — частично применённая
 *     миграция невозможна;
 *   * уже применённые пропускаются (таблица _migrations);
 *   * файлы миграций неизменяемы: чтобы что-то поправить, создайте новую.
 *
 * Запуск: node scripts/migrate.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'database', 'migrations');

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`[migrate] Отсутствует переменная окружения ${key}`);
    process.exit(1);
  }
  return value;
};

const client = new pg.Client({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  database: required('DB_NAME'),
  user: required('DB_USER'),
  password: required('DB_PASSWORD'),
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

const { rows } = await client.query('SELECT name FROM _migrations');
const applied = new Set(rows.map((r) => r.name));

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let count = 0;

for (const file of files) {
  if (applied.has(file)) continue;

  const sql = readFileSync(join(dir, file), 'utf8');
  process.stdout.write(`[migrate] применяю ${file} ... `);

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log('готово');
    count += 1;
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('ОШИБКА');
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

console.log(count === 0 ? '[migrate] новых миграций нет' : `[migrate] применено миграций: ${count}`);
await client.end();
