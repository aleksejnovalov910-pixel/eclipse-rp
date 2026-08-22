import { Kysely, MysqlDialect } from 'kysely';
import mysql from 'mysql2';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import type { Database } from './schema';

const log = createLogger('db');
let instance: Kysely<Database> | null = null;
let pool: mysql.Pool | null = null;

export const db = (): Kysely<Database> => {
  if (!instance) throw new Error('[db] Обращение к базе до вызова connectDatabase().');
  return instance;
};

export const connectDatabase = async (): Promise<void> => {
  if (instance) return;
  const config = loadConfig();
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    connectionLimit: config.db.poolMax,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
    connection.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
  });
  instance = new Kysely<Database>({ dialect: new MysqlDialect({ pool }) });
  const started = Date.now();
  await instance.selectFrom('accounts').select('id').limit(1).execute();
  log.info(`MySQL подключён: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database} (${Date.now()-started} мс)`);
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!instance) return;
  await instance.destroy();
  instance = null;
  pool = null;
  log.info('соединение с MySQL закрыто');
};
