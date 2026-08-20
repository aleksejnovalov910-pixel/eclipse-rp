import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import type { Database } from './schema';

/**
 * Подключение к PostgreSQL.
 *
 * Почему Postgres, а не MySQL: нам нужны транзакции с предсказуемой
 * изоляцией для экономики (переводы денег, маркет, инвентарь), `JSONB` для
 * внешности персонажа и `NUMERIC` для денег. Деньги хранятся в NUMERIC и
 * читаются как строка — числа с плавающей точкой в финансах недопустимы.
 *
 * Почему Kysely, а не полноценная ORM: запросы остаются близкими к SQL и
 * полностью типизированными, при этом нет кодогенерации и нативных
 * бинарников, которые плохо переживают рантайм RAGE MP.
 */

const log = createLogger('db');

// Возвращать NUMERIC (OID 1700) как строку, а не как JS number.
pg.types.setTypeParser(1700, (value: string) => value);
// BIGINT (OID 20) — тоже строкой, чтобы не терять точность.
pg.types.setTypeParser(20, (value: string) => value);

let instance: Kysely<Database> | null = null;
let pool: pg.Pool | null = null;

export const db = (): Kysely<Database> => {
  if (!instance) {
    throw new Error('[db] Обращение к базе до вызова connectDatabase().');
  }
  return instance;
};

export const connectDatabase = async (): Promise<void> => {
  if (instance) return;

  const config = loadConfig();

  pool = new pg.Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    max: config.db.poolMax,
    // Если база недоступна — узнать об этом лучше сразу, а не через минуту.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', (error) => {
    // Ошибка простаивающего соединения не должна ронять процесс.
    log.error('ошибка соединения в пуле', error);
  });

  instance = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  const started = Date.now();
  await instance.selectFrom('accounts').select('id').limit(1).execute();
  log.info(
    `подключение установлено: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database} (${Date.now() - started} мс)`,
  );
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!instance) return;
  await instance.destroy();
  instance = null;
  pool = null;
  log.info('соединение с базой закрыто');
};
