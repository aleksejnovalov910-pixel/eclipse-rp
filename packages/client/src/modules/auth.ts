import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

/**
 * Клиентский модуль авторизации.
 *
 * Клиент здесь — только посредник: он не принимает решений о доступе и не
 * хранит учётные данные. Пароль проходит транзитом и нигде не сохраняется.
 * Единственная задача модуля — разрешить интерфейсу вызывать события входа.
 */
export const registerAuthModule = (): void => {
  allowFromCef(RpcEvent.AuthLogin, RpcEvent.AuthRegister);
};
