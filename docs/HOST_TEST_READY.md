# ECLIPSE RP — HOST TEST READY

Этот этап означает: проект собирается в самодостаточный runtime-пакет для чистого Linux RAGE MP хоста и проходит CI-проверку структуры. Это ещё не означает production-ready до живого теста на конкретном хостинге.

## Требования хоста

- Linux x64 RAGE Multiplayer server runtime от хостинга/официального дистрибутива.
- Node.js 16+ доступный команде `node` для bundled migration-runner (Node 20 рекомендуется).
- PostgreSQL 14+ (CI проверяет PostgreSQL 16).
- Открытый игровой UDP/TCP порт согласно настройкам хостинга.

## Содержимое артефакта

- `packages/eclipse/index.js` — bundled server package.
- `client_packages/index.js` — bundled RAGE MP client entry.
- `client_packages/eclipse/cef/` — CEF UI.
- `database/migrations/` — неизменяемые SQL migrations.
- `ops/migrate.cjs` — bundled migration-runner, внешние npm dependencies на хосте не нужны.
- `ops/start.sh` — загрузка `.env`, применение миграций и запуск RAGE MP.
- `.env.example` — production environment template.
- `conf.json.example` — стартовый RAGE MP config на 500 slots.

## Первый запуск

```bash
cp .env.example .env
cp conf.json.example conf.json
chmod +x ops/start.sh ragemp-server
nano .env
./ops/start.sh
```

Обязательно замените `DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD` и настройте `DB_HOST/DB_PORT/DB_NAME/DB_USER` под PostgreSQL хостинга.

Если бинарник RAGE MP называется иначе:

```bash
RAGEMP_BIN=./server ./ops/start.sh
```

## Что делает launcher

1. Загружает `.env` в environment процесса.
2. Запускает `ops/migrate.cjs`.
3. Migration runner применяет только отсутствующие миграции транзакционно.
4. При ошибке БД RAGE MP не стартует.
5. После успешных migrations выполняется RAGE MP binary через `exec`.

## Первый host smoke test

После запуска проверить последовательно:

1. сервер стартует без `unhandledRejection`/critical boot error;
2. клиент скачивает `client_packages` и CEF открывает авторизацию;
3. регистрация нового аккаунта;
4. создание персонажа;
5. вход в мир и HUD;
6. открыть телефон и планшет;
7. купить товар 24/7 и проверить inventory/bank;
8. купить/доставить машину, замок, топливо;
9. выйти и зайти снова — позиция, деньги, внешний вид и машина сохраняются;
10. рестарт сервера — повторный вход без повторного применения migrations/дюпа.

Если все десять пунктов проходят на реальном хостинге, сборка переходит из `HOST TEST READY` в `HOST VERIFIED`.
