import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Сборка CEF-интерфейса.
 *
 * Всё инлайнится в один HTML: CEF в RAGE MP загружает страницу по
 * `package://`, где привычная схема с относительными запросами к ассетам
 * ведёт себя непредсказуемо. Один самодостаточный файл убирает целый класс
 * проблем «в редакторе работает, в игре белый экран».
 */
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@eclipse/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: '../../dist/client_packages/eclipse/cef',
    emptyOutDir: true,
    target: 'chrome87',
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
