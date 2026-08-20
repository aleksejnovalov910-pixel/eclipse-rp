import { cef } from './core/browser';
import { installCefBridge } from './core/cefBridge';
import { isInWorld } from './core/world';
import { registerAuthModule } from './modules/auth';
import { registerCharacterModule } from './modules/character';
import { registerSessionModule } from './modules/session';

/**
 * Точка входа client-side пакета ECLIPSE RP.
 *
 * Задача первого экрана — чтобы игрок ни секунды не смотрел на пустой мир.
 * Поэтому интерфейс поднимается сразу, ещё до любого обмена с сервером,
 * а не после ответа на первый запрос.
 */

/**
 * Единственный render-обработчик клиента.
 *
 * RAGE MP вызывает его каждый кадр, поэтому здесь не должно появляться
 * ничего тяжёлого — ни запросов, ни аллокаций, ни поиска сущностей.
 * Сейчас это только блокировка ввода вне мира.
 */
mp.events.add('render', () => {
  if (!isInWorld()) {
    mp.game.controls.disableAllControlActions(0);
  }
});

const prepareEntryScene = (): void => {
  const local = mp.players.local;

  // Игрок не должен появиться в мире до выбора персонажа.
  local.freezePosition(true);
  local.setInvincible(true);

  mp.game.ui.displayRadar(false);
  mp.gui.chat.activate(false);
  mp.gui.chat.show(false);

  cef.create();
  cef.screen('auth');
  cef.focus(true);
};

mp.events.add('playerReady', () => {
  installCefBridge();
  registerAuthModule();
  registerCharacterModule();
  registerSessionModule();

  prepareEntryScene();

  // Сообщаем серверу, что клиент и браузер готовы принимать состояние.
  // Раньше этого момента отправлять состояние бессмысленно: браузера ещё нет.
  mp.events.callRemote('eclipse:client:ready');
});
