// Сборка client-side пакета для RAGE MP.
//
// RAGE MP загружает РОВНО ОДИН клиентский entry point: client_packages/index.js.
// Поэтому бандл кладётся именно туда, а не в подпапку — подпапка молча не
// выполнится, и клиент останется без кода.
//
// Ассеты CEF при этом живут в client_packages/eclipse/cef и адресуются как
// package://eclipse/cef/index.html — их удалять здесь нельзя.
//
// Формат IIFE: клиентский рантайм не поддерживает модули и require.
// Цель es2018: движок устаревший, современный синтаксис в части сборок падает.
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('../../dist/client_packages/index.js', { force: true });
rmSync('../../dist/client_packages/index.js.map', { force: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: '../../dist/client_packages/index.js',
  bundle: true,
  platform: 'browser',
  target: 'es2018',
  format: 'iife',
  sourcemap: 'linked',
  logLevel: 'info',
  banner: {
    js: '/* ECLIPSE RP — client bundle. Не редактируйте вручную: файл генерируется из packages/client. */',
  },
});
