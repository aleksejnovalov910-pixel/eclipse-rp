// Сборка server-side пакета для RAGE MP.
//
// Раскладка вывода повторяет структуру серверной папки RAGE MP:
//   dist/packages/eclipse/index.js  ->  <server-files>/packages/eclipse/index.js
// RAGE MP автоматически подхватывает каждую подпапку из `packages/`.
//
// Бандлим всё в один CJS-файл: рантайм RAGE MP резолвит node_modules не так,
// как обычный Node, и «Cannot find module» на живом сервере — самый частый
// способ потерять вечер.
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

const outdir = '../../dist/packages/eclipse';
rmSync(outdir, { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: `${outdir}/index.js`,
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  sourcemap: 'linked',
  logLevel: 'info',
  // pg подтягивает опциональный нативный биндинг, которого в сборке нет.
  external: ['pg-native'],
  banner: {
    js: '/* ECLIPSE RP — server bundle. Не редактируйте вручную: файл генерируется из packages/server. */',
  },
});
