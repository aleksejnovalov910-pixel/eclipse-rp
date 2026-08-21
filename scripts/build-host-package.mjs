import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,statSync,writeFileSync } from 'node:fs';
import { relative,resolve } from 'node:path';

const out=resolve('release/host-test');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const path of ['dist/packages','dist/client_packages']){if(!existsSync(path))throw new Error(`[host-package] missing ${path}; run npm run build first`);}
cpSync('dist/packages',`${out}/packages`,{recursive:true});
cpSync('dist/client_packages',`${out}/client_packages`,{recursive:true});
mkdirSync(`${out}/database`,{recursive:true});
cpSync('database/migrations',`${out}/database/migrations`,{recursive:true});
cpSync('.env.production.example',`${out}/.env.example`);
cpSync('deploy/ragemp/conf.json.example',`${out}/conf.json.example`);

mkdirSync(`${out}/ops`,{recursive:true});
await build({entryPoints:['scripts/host-migrate-entry.mjs'],outfile:`${out}/ops/migrate.cjs`,bundle:true,platform:'node',target:'node20',format:'cjs',external:['pg-native'],logLevel:'warning'});

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
for key in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
  value="\${!key:-}"
  [ -n "$value" ] || { echo "[preflight] Missing $key in $ENV_FILE"; exit 1; }
done
[ "$DB_PASSWORD" != "CHANGE_ME_STRONG_PASSWORD" ] || { echo "[preflight] Change DB_PASSWORD in $ENV_FILE before starting."; exit 1; }
[ -f "$ROOT/conf.json" ] || { echo "[preflight] Missing conf.json. Run ./ops/install.sh first."; exit 1; }
node -e 'JSON.parse(require("fs").readFileSync("conf.json","utf8"))' || { echo "[preflight] conf.json is invalid JSON."; exit 1; }
for path in packages/eclipse/index.js client_packages/index.js client_packages/eclipse/cef/index.html database/migrations ops/migrate.cjs; do
  [ -e "$ROOT/$path" ] || { echo "[preflight] Missing runtime file: $path"; exit 1; }
done
BIN="\${RAGEMP_BIN:-./ragemp-server}"
[ -x "$BIN" ] || { echo "[preflight] RAGE MP binary not found/executable: $BIN"; exit 1; }
echo "[preflight] OK: Node $(node -v), config/runtime present, RAGE MP binary executable."
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
BIN="\${RAGEMP_BIN:-./ragemp-server}"
if [ -f "$BIN" ]; then chmod +x "$BIN" 2>/dev/null || true; fi
echo "[install] Files prepared. Edit .env (especially DB_PASSWORD), review conf.json, place/provide the Linux RAGE MP binary, then run ./ops/start.sh"
`;
writeFileSync(`${out}/ops/install.sh`,installer);

const launcher=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
"$ROOT/ops/preflight.sh"
ENV_FILE="\${ECLIPSE_ENV_FILE:-$ROOT/.env}"
set -a
. "$ENV_FILE"
set +a
echo "[start] Applying PostgreSQL migrations..."
node "$ROOT/ops/migrate.cjs"
BIN="\${RAGEMP_BIN:-./ragemp-server}"
echo "[start] Starting RAGE MP: $BIN"
exec "$BIN"
`;
writeFileSync(`${out}/ops/start.sh`,launcher);

writeFileSync(`${out}/HOST_TEST_READY.txt`,`ECLIPSE RP — HOST TEST PACKAGE\n\nCLEAN LINUX FIRST INSTALL\n1. Copy this package into the root of a clean Linux RAGE MP server.\n2. Keep/place the official Linux RAGE MP binary/runtime supplied by your host.\n3. Run: chmod +x ops/*.sh && ./ops/install.sh\n4. Edit .env: set real PostgreSQL credentials and replace CHANGE_ME_STRONG_PASSWORD.\n5. Review conf.json (500 slots by default, bind 0.0.0.0).\n6. Start with: ./ops/start.sh\n\nSTART SEQUENCE\npreflight -> PostgreSQL migrations -> RAGE MP binary.\nThe launcher refuses to start with missing runtime/config, Node <20, placeholder DB password, invalid conf.json, or missing/non-executable RAGE MP binary.\n\nLIVE HOST SMOKE TEST REQUIRED AFTER START\nregistration -> character -> world -> vehicle -> store -> bank -> reconnect -> server restart/reconnect.\n`);

const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=resolve(dir,entry.name);return entry.isDirectory()?walk(p):[p];});
const manifestFiles=walk(out).filter(p=>!p.endsWith('RELEASE_MANIFEST.json')).map(p=>({path:relative(out,p).replaceAll('\\','/'),size:statSync(p).size,sha256:createHash('sha256').update(readFileSync(p)).digest('hex')})).sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(`${out}/RELEASE_MANIFEST.json`,JSON.stringify({format:1,nodeMinimum:20,generatedAt:new Date().toISOString(),files:manifestFiles},null,2)+'\n');
console.log(`[host-package] ready: ${out} (${manifestFiles.length} files)`);
