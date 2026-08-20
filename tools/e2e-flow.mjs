/**
 * Сквозной тест игрового флоу ECLIPSE.
 *
 * Проверяет путь «подключение -> регистрация -> вход -> создание персонажа ->
 * выбор персонажа» на настоящей базе, без запуска RAGE MP. Глобальный `mp`
 * подменяется заглушкой, которая ведёт себя так же, как игровой сервер:
 * хранит обработчики, отдаёт объект игрока и записывает вызовы `player.call`.
 *
 * Зачем это нужно: компилятор не поймает ни отсутствующий обработчик, ни
 * ошибку в SQL, ни неверный порядок состояний сессии. А поднять RAGE MP в CI
 * невозможно — нужна лицензионная GTA V.
 *
 * Запуск:
 *   DB_NAME=... DB_USER=... DB_PASSWORD=... node tools/e2e-flow.mjs
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

// ---------- заглушка RAGE MP ----------

const handlers = new Map();
const outgoing = [];

globalThis.mp = {
  events: {
    add(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
  },
  players: {
    exists: (player) => player?.alive !== false,
  },
  joaat: (value) => value.length,
  Vector3: class {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  },
};

const fire = (name, ...args) => {
  const list = handlers.get(name);
  if (!list || list.length === 0) throw new Error(`Обработчик "${name}" не зарегистрирован`);
  for (const handler of list) handler(...args);
};

const makePlayer = (id, socialClub) => ({
  id,
  socialClub,
  ip: '127.0.0.1',
  name: '',
  model: 0,
  health: 100,
  armour: 0,
  heading: 0,
  dimension: 0,
  alive: true,
  position: null,
  kicked: null,
  call(event, args) {
    outgoing.push({ playerId: id, event, args });
  },
  kick(reason) {
    this.kicked = reason;
  },
  spawn(position) {
    this.position = position;
  },
});

// ---------- RPC-хелпер ----------

let requestCounter = 0;

/** Выполняет RPC так же, как это делает клиент, и ждёт ответ сервера. */
const rpc = async (player, event, payload) => {
  requestCounter += 1;
  const requestId = `test-${requestCounter}`;

  fire(event, player, requestId, JSON.stringify(payload ?? {}));

  const deadline = Date.now() + 10_000;
  for (;;) {
    const index = outgoing.findIndex(
      (message) => message.event === 'eclipse:rpc:reply' && message.args[0] === requestId,
    );
    if (index !== -1) {
      const [, json] = outgoing[index].args;
      outgoing.splice(index, 1);
      return JSON.parse(json);
    }
    if (Date.now() > deadline) throw new Error(`Таймаут ответа на ${event}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// ---------- прогон ----------

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

const db = new pg.Client({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
await db.connect();

// Тест изолирован: работает на чистых таблицах.
await db.query('TRUNCATE characters, auth_log, accounts RESTART IDENTITY CASCADE');

const require = createRequire(import.meta.url);
require('../dist/packages/eclipse/index.js');

// Ждём завершения bootstrap (подключение к базе асинхронно).
await new Promise((resolve) => setTimeout(resolve, 2500));

const player = makePlayer(0, 'TestPlayer');
fire('playerJoin', player);

check('сессия открыта, игрок не отключён', () => assert.equal(player.kicked, null));

// --- регистрация ---
const registered = await rpc(player, 'eclipse:auth:register', {
  login: 'test_user',
  email: 'test@example.com',
  password: 'correct horse battery',
});
check('регистрация успешна', () => assert.equal(registered.ok, true));
check('вернулся профиль аккаунта', () => assert.equal(registered.data.account.login, 'test_user'));

const hashRow = await db.query('SELECT password_hash FROM accounts WHERE login = $1', ['test_user']);
check('пароль не хранится открытым текстом', () => {
  assert.match(hashRow.rows[0].password_hash, /^scrypt\$/);
  assert.ok(!hashRow.rows[0].password_hash.includes('correct horse'));
});

// --- повторная регистрация того же логина ---
const player2 = makePlayer(1, 'TestPlayer2');
fire('playerJoin', player2);
const duplicate = await rpc(player2, 'eclipse:auth:register', {
  login: 'TEST_USER',
  email: 'other@example.com',
  password: 'another password',
});
check('логин занят независимо от регистра', () => {
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, 'ACCOUNT_EXISTS');
});

// --- вход с неверным паролем ---
const player3 = makePlayer(2, 'TestPlayer3');
fire('playerJoin', player3);
const wrong = await rpc(player3, 'eclipse:auth:login', { login: 'test_user', password: 'wrong password!' });
check('неверный пароль отклонён', () => {
  assert.equal(wrong.ok, false);
  assert.equal(wrong.code, 'INVALID_CREDENTIALS');
});

// --- вход с несуществующим логином даёт ТОТ ЖЕ код ---
const unknown = await rpc(player3, 'eclipse:auth:login', { login: 'no_such_user', password: 'wrong password!' });
check('несуществующий аккаунт неотличим от неверного пароля', () =>
  assert.equal(unknown.code, 'INVALID_CREDENTIALS'),
);

// --- rate limit ---
let limited = null;
for (let attempt = 0; attempt < 8; attempt += 1) {
  const response = await rpc(player3, 'eclipse:auth:login', { login: 'test_user', password: 'wrong password!' });
  if (response.code === 'RATE_LIMITED') {
    limited = response;
    break;
  }
}
check('перебор паролей упирается в лимит', () => assert.ok(limited, 'лимит не сработал'));

// --- успешный вход ---
const player4 = makePlayer(3, 'TestPlayer4');
fire('playerJoin', player4);
const loggedIn = await rpc(player4, 'eclipse:auth:login', {
  login: 'test_user',
  password: 'correct horse battery',
});
check('вход с верным паролем', () => assert.equal(loggedIn.ok, true));

// --- список персонажей пуст ---
const emptyList = await rpc(player4, 'eclipse:character:list', {});
check('у нового аккаунта нет персонажей', () => {
  assert.equal(emptyList.ok, true);
  assert.equal(emptyList.data.length, 0);
});

// --- создание персонажа ---
const created = await rpc(player4, 'eclipse:character:create', {
  slot: 0,
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
});
check('персонаж создан', () => assert.equal(created.ok, true));

// --- имя занято ---
const sameName = await rpc(player4, 'eclipse:character:create', {
  slot: 1,
  firstName: 'John',
  lastName: 'Doe',
  gender: 'female',
});
check('дубликат имени отклонён', () => assert.equal(sameName.code, 'CHARACTER_NAME_TAKEN'));

// --- слот занят ---
const sameSlot = await rpc(player4, 'eclipse:character:create', {
  slot: 0,
  firstName: 'Jane',
  lastName: 'Roe',
  gender: 'female',
});
check('занятый слот отклонён', () => assert.equal(sameSlot.code, 'CHARACTER_SLOT_TAKEN'));

// --- некорректное имя ---
const badName = await rpc(player4, 'eclipse:character:create', {
  slot: 1,
  firstName: 'j0hn',
  lastName: 'Doe',
  gender: 'male',
});
check('имя с цифрами отклонено', () => assert.equal(badName.code, 'VALIDATION'));

// --- чужой персонаж недоступен ---
const player5 = makePlayer(4, 'TestPlayer5');
fire('playerJoin', player5);
await rpc(player5, 'eclipse:auth:register', {
  login: 'second_user',
  email: 'second@example.com',
  password: 'another good password',
});
const foreign = await rpc(player5, 'eclipse:character:select', { characterId: created.data.characterId });
check('нельзя войти за чужого персонажа', () => assert.equal(foreign.code, 'CHARACTER_NOT_FOUND'));

// --- выбор своего персонажа и спавн ---
const selected = await rpc(player4, 'eclipse:character:select', { characterId: created.data.characterId });
check('выбор персонажа успешен', () => assert.equal(selected.ok, true));
check('игрок помещён в мир', () => {
  assert.ok(player4.position, 'позиция не установлена');
  assert.equal(player4.name, 'John Doe');
});
check('клиенту отправлено состояние Playing', () => {
  const message = outgoing.find(
    (m) => m.playerId === 3 && m.event === 'eclipse:session:state' && m.args[0] === 'playing',
  );
  assert.ok(message, 'состояние Playing не отправлено');
});

// --- повторный выбор запрещён ---
const twice = await rpc(player4, 'eclipse:character:select', { characterId: created.data.characterId });
check('повторный вход в мир заблокирован', () => assert.equal(twice.ok, false));

// --- журнал авторизаций ---
const log = await db.query('SELECT success, failure_reason FROM auth_log ORDER BY id');
check('попытки входа записаны в журнал', () => {
  assert.ok(log.rows.length >= 3, `ожидались записи, получено ${log.rows.length}`);
  assert.ok(log.rows.some((r) => r.success === true), 'нет записи об успешном входе');
  assert.ok(log.rows.some((r) => r.failure_reason === 'wrong_password'), 'нет записи о неверном пароле');
});

// --- отключение закрывает сессию ---
fire('playerQuit', player4, 'disconnect', '');
const afterQuit = await rpc(player4, 'eclipse:character:list', {});
check('после отключения RPC недоступны', () => assert.equal(afterQuit.code, 'UNAUTHORIZED'));

await db.end();

// ---------- отчёт ----------

console.log('\n================ E2E ФЛОУ ================');
let failed = 0;
for (const result of results) {
  console.log(result.ok ? `  ✓ ${result.name}` : `  ✗ ${result.name} — ${result.error}`);
  if (!result.ok) failed += 1;
}
console.log('=========================================');
console.log(`проверок: ${results.length}, провалено: ${failed}\n`);
process.exit(failed === 0 ? 0 : 1);
