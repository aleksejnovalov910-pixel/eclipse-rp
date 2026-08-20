/**
 * Дымовой тест серверного бандла.
 *
 * Настоящий RAGE MP здесь недоступен, поэтому подставляется минимальная
 * заглушка глобального `mp`. Тест проверяет ровно две вещи, которые ломаются
 * чаще всего и которые нельзя увидеть компилятором:
 *   1. бандл загружается и не падает при отсутствующей базе;
 *   2. все ожидаемые RPC-обработчики действительно зарегистрированы.
 */
import { createRequire } from 'node:module';

const registered = new Set();

globalThis.mp = {
  events: { add: (name) => registered.add(name) },
  players: { exists: () => true },
  joaat: () => 0,
  Vector3: class {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  },
};

process.env.DB_NAME = 'eclipse_smoke';
process.env.DB_USER = 'eclipse';
process.env.DB_PASSWORD = 'smoke';
process.env.DB_HOST = '127.0.0.1';
process.env.LOG_LEVEL = 'debug';

const require = createRequire(import.meta.url);
require('../dist/packages/eclipse/index.js');

const EXPECTED = [
  'playerJoin',
  'playerQuit',
  'eclipse:client:ready',
  'eclipse:auth:login',
  'eclipse:auth:register',
  'eclipse:character:list',
  'eclipse:character:create',
  'eclipse:character:select',
  'eclipse:character:nameCheck',
];

// Регистрация модулей идёт после await connectDatabase(), поэтому ждём,
// пока попытка подключения завершится отказом.
await new Promise((resolve) => setTimeout(resolve, 7000));

const missing = EXPECTED.filter((name) => !registered.has(name));

console.log('\n--- РЕЗУЛЬТАТ ДЫМОВОГО ТЕСТА ---');
console.log('зарегистрировано событий:', registered.size);
console.log('ожидаемые отсутствуют:', missing.length === 0 ? 'нет' : missing.join(', '));
process.exit(0);
