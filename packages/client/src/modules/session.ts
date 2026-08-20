import { ServerEvent, SessionState } from '@eclipse/shared';
import { cef } from '../core/browser';
import { setInWorld } from '../core/world';

/**
 * Реакция клиента на смену состояния сессии.
 *
 * Источник правды о состоянии — сервер. Клиент никогда не переводит себя
 * в мир самостоятельно: иначе достаточно было бы подделать одно локальное
 * событие, чтобы оказаться в игре без выбранного персонажа.
 */
export const registerSessionModule = (): void => {
  mp.events.add(ServerEvent.SessionState, (state: string) => {
    switch (state) {
      case SessionState.Authenticating:
        cef.screen('auth');
        cef.focus(true);
        setInWorld(false);
        break;

      case SessionState.CharacterSelect:
      case SessionState.CharacterCreate:
        cef.screen('characterSelect');
        cef.focus(true);
        setInWorld(false);
        break;

      case SessionState.Playing:
        enterWorld();
        break;

      default:
        break;
    }
  });

  mp.events.add(ServerEvent.Notify, (type: string, text: string) => {
    cef.notify(type, text);
  });
};

/**
 * Переход в мир.
 *
 * Порядок обратный подготовке экрана входа: сначала убираем интерфейс и
 * возвращаем управление, потом включаем игровые элементы. Если сделать
 * наоборот, игрок на мгновение получает радар и чат поверх экрана выбора.
 */
const enterWorld = (): void => {
  cef.screen('blank');
  cef.focus(false);

  setInWorld(true);

  const local = mp.players.local;
  local.freezePosition(false);
  local.setInvincible(false);

  mp.game.ui.displayRadar(true);
  mp.gui.chat.activate(true);
  mp.gui.chat.show(true);
};
