/**
 * Сквозной тест игрового флоу ECLIPSE.
 *
 * Проверяет путь «подключение -> регистрация -> вход -> создание персонажа ->
 * выбор персонажа» на настоящей MySQL-базе, без запуска RAGE MP.
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const handlers = new Map();
const outgoing = [];
const online = new Map();

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
    at: (id) => online.get(id),
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
  position: { x: 0, y: 0, z: 0 },
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

let requestCounter = 0;
const connect = (id, socialClub) => {
  const player = makePlayer(id, socialClub);
  online.set(id, player);
  fire('playerJoin', player);
  return player;
};

const disconnect = (player) => {
  online.delete(player.id);
  fire('playerQuit', player, 'disconnect', '');
};

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

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

process.env.AUTOSAVE_SECONDS = process.env.AUTOSAVE_SECONDS ?? '2';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: false,
});

const db = {
  async query(sql, params = []) {
    if (/^TRUNCATE\s+characters,\s*auth_log,\s*accounts\s+RESTART\s+IDENTITY\s+CASCADE$/i.test(sql.trim())) {
      await connection.query('SET FOREIGN_KEY_CHECKS=0');
      try {
        await connection.query('TRUNCATE TABLE auth_log');
        await connection.query('TRUNCATE TABLE characters');
        await connection.query('TRUNCATE TABLE accounts');
      } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS=1');
      }
      return { rows: [], rowCount: 0 };
    }
    const ordered = [];
    const mysqlSql = sql.replace(/\$(\d+)/g, (_, n) => {
      ordered.push(params[Number(n) - 1]);
      return '?';
    });
    const [rows] = await connection.execute(mysqlSql, ordered.length ? ordered : params);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (Object.prototype.hasOwnProperty.call(row, 'success')) row.success = Boolean(row.success);
      }
      return { rows, rowCount: rows.length };
    }
    return { rows: [], rowCount: rows.affectedRows ?? 0 };
  },
  async end() {
    await connection.end();
  },
};

await db.query('TRUNCATE characters, auth_log, accounts RESTART IDENTITY CASCADE');

const require = createRequire(import.meta.url);
require('../dist/packages/eclipse/index.js');
await new Promise((resolve) => setTimeout(resolve, 2500));

const player = connect(0, 'TestPlayer');
check('сессия открыта, игрок не отключён', () => assert.equal(player.kicked, null));

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

const player2 = connect(1, 'TestPlayer2');
const duplicate = await rpc(player2, 'eclipse:auth:register', {
  login: 'TEST_USER',
  email: 'other@example.com',
  password: 'another password',
});
check('логин занят независимо от регистра', () => {
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, 'ACCOUNT_EXISTS');
});

const player3 = connect(2, 'TestPlayer3');
const wrong = await rpc(player3, 'eclipse:auth:login', { login: 'test_user', password: 'wrong password!' });
check('неверный пароль отклонён', () => {
  assert.equal(wrong.ok, false);
  assert.equal(wrong.code, 'INVALID_CREDENTIALS');
});

const unknown = await rpc(player3, 'eclipse:auth:login', { login: 'no_such_user', password: 'wrong password!' });
check('несуществующий аккаунт неотличим от неверного пароля', () =>
  assert.equal(unknown.code, 'INVALID_CREDENTIALS'),
);

let limited = null;
for (let attempt = 0; attempt < 8; attempt += 1) {
  const response = await rpc(player3, 'eclipse:auth:login', { login: 'test_user', password: 'wrong password!' });
  if (response.code === 'RATE_LIMITED') {
    limited = response;
    break;
  }
}
check('перебор паролей упирается в лимит', () => assert.ok(limited, 'лимит не сработал'));

const player4 = connect(3, 'TestPlayer4');
const loggedIn = await rpc(player4, 'eclipse:auth:login', {
  login: 'test_user',
  password: 'correct horse battery',
});
check('вход с верным паролем', () => assert.equal(loggedIn.ok, true));

const emptyList = await rpc(player4, 'eclipse:character:list', {});
check('у нового аккаунта нет персонажей', () => {
  assert.equal(emptyList.ok, true);
  assert.equal(emptyList.data.length, 0);
});

const created = await rpc(player4, 'eclipse:character:create', {
  slot: 0,
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
});
check('персонаж создан', () => assert.equal(created.ok, true));

const sameName = await rpc(player4, 'eclipse:character:create', {
  slot: 1,
  firstName: 'John',
  lastName: 'Doe',
  gender: 'female',
});
check('дубликат имени отклонён', () => assert.equal(sameName.code, 'CHARACTER_NAME_TAKEN'));

const sameSlot = await rpc(player4, 'eclipse:character:create', {
  slot: 0,
  firstName: 'Jane',
  lastName: 'Roe',
  gender: 'female',
});
check('занятый слот отклонён', () => assert.equal(sameSlot.code, 'CHARACTER_SLOT_TAKEN'));

const badName = await rpc(player4, 'eclipse:character:create', {
  slot: 1,
  firstName: 'j0hn',
  lastName: 'Doe',
  gender: 'male',
});
check('имя с цифрами отклонено', () => assert.equal(badName.code, 'VALIDATION'));

const player5 = connect(4, 'TestPlayer5');
await rpc(player5, 'eclipse:auth:register', {
  login: 'second_user',
  email: 'second@example.com',
  password: 'another good password',
});
const foreign = await rpc(player5, 'eclipse:character:select', { characterId: created.data.characterId });
check('нельзя войти за чужого персонажа', () => assert.equal(foreign.code, 'CHARACTER_NOT_FOUND'));

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

const twice = await rpc(player4, 'eclipse:character:select', { characterId: created.data.characterId });
check('повторный вход в мир заблокирован', () => assert.equal(twice.ok, false));

const log = await db.query('SELECT success, failure_reason FROM auth_log ORDER BY id');
check('попытки входа записаны в журнал', () => {
  assert.ok(log.rows.length >= 3, `ожидались записи, получено ${log.rows.length}`);
  assert.ok(log.rows.some((r) => r.success === true), 'нет записи об успешном входе');
  assert.ok(log.rows.some((r) => r.failure_reason === 'wrong_password'), 'нет записи о неверном пароле');
});

const characterId = created.data.characterId;
const readState = async () =>
  (
    await db.query(
      'SELECT position_x, position_y, position_z, heading, dimension, health, armour, played_minutes FROM characters WHERE id = $1',
      [characterId],
    )
  ).rows[0];

const spawnState = await readState();
check('после создания персонаж стоит в стартовой точке', () =>
  assert.equal(Number(spawnState.position_x).toFixed(1), '-1604.3'),
);

player4.position = { x: 100.5, y: 200.25, z: 30.125 };
player4.heading = 90.5;
player4.health = 77;
player4.armour = 42;
await new Promise((resolve) => setTimeout(resolve, 2600));

const autosaved = await readState();
check('автосохранение записало позицию без выхода игрока', () => {
  assert.equal(Number(autosaved.position_x).toFixed(3), '100.500');
  assert.equal(Number(autosaved.position_z).toFixed(3), '30.125');
});
check('автосохранение записало здоровье и броню', () => {
  assert.equal(autosaved.health, 77);
  assert.equal(autosaved.armour, 42);
});
check('короткая сессия не начисляет фантомных минут', () =>
  assert.equal(autosaved.played_minutes, 0),
);

player4.position = { x: 555.5, y: 666.25, z: 77.75 };
player4.heading = 180.25;
player4.health = 55;
disconnect(player4);
await new Promise((resolve) => setTimeout(resolve, 600));

const afterQuitState = await readState();
check('выход сохранил позицию', () => {
  assert.equal(Number(afterQuitState.position_x).toFixed(3), '555.500');
  assert.equal(Number(afterQuitState.position_y).toFixed(3), '666.250');
});
check('выход сохранил здоровье и поворот', () => {
  assert.equal(afterQuitState.health, 55);
  assert.equal(Number(afterQuitState.heading).toFixed(2), '180.25');
});

const afterQuit = await rpc(player4, 'eclipse:character:list', {});
check('после отключения RPC недоступны', () => assert.equal(afterQuit.code, 'UNAUTHORIZED'));

const player6 = connect(5, 'TestPlayer4');
const reLogin = await rpc(player6, 'eclipse:auth:login', {
  login: 'test_user',
  password: 'correct horse battery',
});
check('повторный вход в аккаунт', () => assert.equal(reLogin.ok, true));

const reSelect = await rpc(player6, 'eclipse:character:select', { characterId });
check('повторный выбор персонажа успешен', () => assert.equal(reSelect.ok, true));
check('персонаж восстановлен в сохранённой точке', () => {
  assert.ok(player6.position, 'позиция не установлена');
  assert.equal(player6.position.x.toFixed(3), '555.500');
  assert.equal(player6.position.z.toFixed(3), '77.750');
});
check('восстановлено сохранённое здоровье', () => assert.equal(player6.health, 55));
check('спавн не вернул здоровье к максимуму', () => assert.notEqual(player6.health, 100));

await db.query('UPDATE characters SET cash = 12345.67 WHERE id = $1', [characterId]);
player6.position = { x: 1.5, y: 2.5, z: 3.5 };
await new Promise((resolve) => setTimeout(resolve, 2600));

const afterMoneyChange = await db.query('SELECT cash, position_x FROM characters WHERE id = $1', [characterId]);
check('автосохранение не затирает деньги устаревшим снимком', () =>
  assert.equal(Number(afterMoneyChange.rows[0].cash).toFixed(2), '12345.67'),
);
check('при этом позиция всё равно сохраняется', () =>
  assert.equal(Number(afterMoneyChange.rows[0].position_x).toFixed(3), '1.500'),
);

await db.query('UPDATE characters SET played_minutes = 100 WHERE id = $1', [characterId]);
const realNow = Date.now;
Date.now = () => realNow() + 5 * 60_000;
await new Promise((resolve) => setTimeout(resolve, 2600));

const afterPlaytime = await db.query('SELECT played_minutes FROM characters WHERE id = $1', [characterId]);
check('наигранное время прибавляется к существующему, а не заменяет его', () =>
  assert.equal(afterPlaytime.rows[0].played_minutes, 105),
);

Date.now = realNow;
await new Promise((resolve) => setTimeout(resolve, 2600));

const afterRewind = await db.query('SELECT played_minutes FROM characters WHERE id = $1', [characterId]);
check('повторное сохранение не начисляет те же минуты дважды', () =>
  assert.equal(afterRewind.rows[0].played_minutes, 105),
);

const player7 = connect(6, 'TestPlayer4');
const raceLogin = await rpc(player7, 'eclipse:auth:login', {
  login: 'test_user',
  password: 'correct horse battery',
});
check('вход перед проверкой гонки выполнен', () => assert.equal(raceLogin.ok, true));

player6.position = { x: 321.5, y: 654.25, z: 88.5 };
player6.health = 63;
disconnect(player6);
const raceSelect = await rpc(player7, 'eclipse:character:select', { characterId });

check('вход после мгновенного переподключения успешен', () => assert.equal(raceSelect.ok, true));
check('гонка не привела к откату позиции', () => {
  assert.equal(player7.position.x.toFixed(3), '321.500');
  assert.equal(player7.position.z.toFixed(3), '88.500');
});
check('гонка не привела к откату здоровья', () => assert.equal(player7.health, 63));

player7.position = { x: 999.5, y: 888.5, z: 44.25 };
process.emit('SIGTERM');
await new Promise((resolve) => setTimeout(resolve, 1200));

const afterShutdown = await db.query('SELECT position_x FROM characters WHERE id = $1', [characterId]);
check('остановка сервера сохранила состояние игроков', () =>
  assert.equal(Number(afterShutdown.rows[0].position_x).toFixed(3), '999.500'),
);

await db.end();

console.log('\n================ E2E ФЛОУ ================');
let failed = 0;
for (const result of results) {
  console.log(result.ok ? `  ✓ ${result.name}` : `  ✗ ${result.name} — ${result.error}`);
  if (!result.ok) failed += 1;
}
console.log('=========================================');
console.log(`проверок: ${results.length}, провалено: ${failed}\n`);
process.exit(failed === 0 ? 0 : 1);
