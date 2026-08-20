/**
 * Дымовой тест серверного бандла.
 *
 * Настоящий RAGE MP здесь недоступен, поэтому подставляется минимальная
 * заглушка глобального `mp`. Тест проверяет, что собранный бандл загружается
 * против тестовой БД и регистрирует все обязательные обработчики.
 *
 * В CI параметры PostgreSQL уже переданы окружением. Здесь задаются только
 * локальные fallback-значения — тест не должен перетирать корректный пароль CI.
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

process.env.DB_NAME ??= 'eclipse_smoke';
process.env.DB_USER ??= 'eclipse';
process.env.DB_PASSWORD ??= 'smoke';
process.env.DB_HOST ??= '127.0.0.1';
process.env.LOG_LEVEL ??= 'debug';
process.env.AUTOSAVE_SECONDS ??= '0';

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

const deadline = Date.now() + 10_000;
while (Date.now() < deadline) {
  if (EXPECTED.every((name) => registered.has(name))) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const missing = EXPECTED.filter((name) => !registered.has(name));

console.log('\n--- РЕЗУЛЬТАТ ДЫМОВОГО ТЕСТА ---');
console.log('зарегистрировано событий:', registered.size);
console.log('ожидаемые отсутствуют:', missing.length === 0 ? 'нет' : missing.join(', '));

if (missing.length > 0) {
  console.error('Дымовой тест провален: обязательные обработчики не зарегистрированы.');
  process.exit(1);
}

process.exit(0);
