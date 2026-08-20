import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

/**
 * Клиентский модуль персонажей.
 *
 * Проверка принадлежности персонажа аккаунту выполняется на сервере — здесь
 * только разрешение событий. Клиент принципиально не знает, какие персонажи
 * существуют, пока сервер их не пришлёт.
 */
export const registerCharacterModule = (): void => {
  allowFromCef(
    RpcEvent.CharacterList,
    RpcEvent.CharacterSelect,
    RpcEvent.CharacterCreate,
    RpcEvent.CharacterNameCheck,
  );
};
