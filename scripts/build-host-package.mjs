import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,statSync,writeFileSync } from 'node:fs';
import { relative,resolve } from 'node:path';
import { mysqlize } from './mysql-compat.mjs';

const out=resolve('release/host-test');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const path of ['dist/packages','dist/client_packages']){if(!existsSync(path))throw new Error(`[host-package] missing ${path}; run npm run build first`);}
cpSync('dist/packages',`${out}/packages`,{recursive:true});
cpSync('dist/client_packages',`${out}/client_packages`,{recursive:true});
mkdirSync(`${out}/database`,{recursive:true});
cpSync('database/migrations',`${out}/database/migrations`,{recursive:true});
cpSync('.env.production.example',`${out}/.env.example`);
cpSync('deploy/ragemp/conf.json.example',`${out}/conf.json.example`);

// Один готовый файл для ручного импорта в phpMyAdmin. После каждого блока отмечаем
// миграцию применённой, чтобы ops/start.sh не пытался выполнить её повторно.
const migrationNames=readdirSync('database/migrations').filter(x=>x.endsWith('.sql')).sort();
let fullSql="SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS=0;\nCREATE TABLE IF NOT EXISTS _migrations(name VARCHAR(255) PRIMARY KEY,applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";
for(const file of migrationNames){fullSql+=`-- ===== ${file} =====\n${mysqlize(readFileSync(`database/migrations/${file}`,'utf8'),file)}\nINSERT IGNORE INTO _migrations(name) VALUES ('${file.replaceAll("'","''")}');\n\n`;}
fullSql+='SET FOREIGN_KEY_CHECKS=1;\n';
writeFileSync(`${out}/database/ECLIPSE_RP_MYSQL_FULL.sql`,fullSql);

mkdirSync(`${out}/ops`,{recursive:true});
await build({entryPoints:['scripts/host-migrate-entry.mjs'],outfile:`${out}/ops/migrate.cjs`,bundle:true,platform:'node',target:'node20',format:'cjs',logLevel:'warning'});

const preflight=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="\${ECLIPSE_ENV_FILE:-$ROOT/.env}"
[ -f "$ENV_FILE" ] || { echo "[preflight] Missing $ENV_FILE. Run ./ops/install.sh first."; exit 1; }
set -a
. "$ENV_FILE"
set +a
command -v node >/dev/null 2>&1 || { echo "[preflight] Node.js 20+ is required."; exit 1; }
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "[preflight] Node.js 20+ required, found $(node -v)."; exit 1; }
for key in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do value="\${!key:-}"; [ -n "$value" ] || { echo "[preflight] Missing $key in $ENV_FILE"; exit 1; }; done
[ "$DB_PASSWORD" != "CHANGE_ME_STRONG_PASSWORD" ] || { echo "[preflight] Change DB_PASSWORD in $ENV_FILE before starting."; exit 1; }
[ -f "$ROOT/conf.json" ] || { echo "[preflight] Missing conf.json. Run ./ops/install.sh first."; exit 1; }
node -e 'JSON.parse(require("fs").readFileSync("conf.json","utf8"))' || { echo "[preflight] conf.json is invalid JSON."; exit 1; }
for path in packages/eclipse/index.js client_packages/index.js client_packages/eclipse/cef/index.html database/migrations database/ECLIPSE_RP_MYSQL_FULL.sql ops/migrate.cjs; do [ -e "$ROOT/$path" ] || { echo "[preflight] Missing runtime file: $path"; exit 1; }; done
BIN="\${RAGEMP_BIN:-./ragemp-server}"
[ -x "$BIN" ] || { echo "[preflight] RAGE MP binary not found/executable: $BIN"; exit 1; }
echo "[preflight] OK: Node $(node -v), MySQL config/runtime present, RAGE MP binary executable."
`;
writeFileSync(`${out}/ops/preflight.sh`,preflight);

const installer=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
command -v node >/dev/null 2>&1 || { echo "[install] Install Node.js 20+ before continuing."; exit 1; }
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "[install] Node.js 20+ required, found $(node -v)."; exit 1; }
if [ ! -f .env ]; then cp .env.example .env; echo "[install] Created .env from .env.example"; else echo "[install] Keeping existing .env"; fi
if [ ! -f conf.json ]; then cp conf.json.example conf.json; echo "[install] Created conf.json from conf.json.example"; else echo "[install] Keeping existing conf.json"; fi
chmod +x ops/install.sh ops/preflight.sh ops/start.sh 2>/dev/null || true
BIN="\${RAGEMP_BIN:-./ragemp-server}"; if [ -f "$BIN" ]; then chmod +x "$BIN" 2>/dev/null || true; fi
echo "[install] Edit .env with MySQL credentials. For phpMyAdmin you may import database/ECLIPSE_RP_MYSQL_FULL.sql once, or let ./ops/start.sh run migrations automatically."
`;
writeFileSync(`${out}/ops/install.sh`,installer);

const launcher=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"; "$ROOT/ops/preflight.sh"
ENV_FILE="\${ECLIPSE_ENV_FILE:-$ROOT/.env}"; set -a; . "$ENV_FILE"; set +a
echo "[start] Applying MySQL migrations..."; node "$ROOT/ops/migrate.cjs"
BIN="\${RAGEMP_BIN:-./ragemp-server}"; echo "[start] Starting RAGE MP: $BIN"; exec "$BIN"
`;
writeFileSync(`${out}/ops/start.sh`,launcher);

writeFileSync(`${out}/HOST_TEST_READY.txt`,`ECLIPSE RP — GTA5HOST / MYSQL HOST TEST PACKAGE\n\n1. Upload this package into the RAGE MP server root.\n2. Run ./ops/install.sh or create .env manually.\n3. Put GTA5HOST MySQL credentials into .env (usually port 3306).\n4. Database: either import database/ECLIPSE_RP_MYSQL_FULL.sql in phpMyAdmin, OR simply start through ./ops/start.sh and migrations will run automatically. Do not do both concurrently.\n5. Review conf.json and start through ./ops/start.sh.\n\nLIVE TEST: registration -> character -> world -> vehicle -> store -> bank -> reconnect -> server restart/reconnect.\n`);

const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=resolve(dir,entry.name);return entry.isDirectory()?walk(p):[p];});
const manifestFiles=walk(out).filter(p=>!p.endsWith('RELEASE_MANIFEST.json')).map(p=>({path:relative(out,p).replaceAll('\\','/'),size:statSync(p).size,sha256:createHash('sha256').update(readFileSync(p)).digest('hex')})).sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(`${out}/RELEASE_MANIFEST.json`,JSON.stringify({format:2,database:'mysql',nodeMinimum:20,generatedAt:new Date().toISOString(),files:manifestFiles},null,2)+'\n');
console.log(`[host-package] ready: ${out} (${manifestFiles.length} files, MySQL/phpMyAdmin bundle included)`);
