/**
 * Контракт событий ECLIPSE.
 *
 * Все имена событий объявляются ЗДЕСЬ и нигде больше. Server, Client и CEF
 * импортируют один и тот же модуль, поэтому опечатка в имени события
 * становится ошибкой компиляции, а не молчаливым «ничего не произошло».
 *
 * Соглашение об именовании: `eclipse:<домен>:<действие>`.
 */

/** Client -> Server RPC (запрос/ответ). */
export const RpcEvent = {
  AuthLogin: 'eclipse:auth:login',
  AuthRegister: 'eclipse:auth:register',
  CharacterList: 'eclipse:character:list',
  CharacterSelect: 'eclipse:character:select',
  CharacterCreate: 'eclipse:character:create',
  CharacterNameCheck: 'eclipse:character:nameCheck',

  EconomyBalance: 'eclipse:economy:balance',
  EconomyDeposit: 'eclipse:economy:deposit',
  EconomyWithdraw: 'eclipse:economy:withdraw',
  EconomyTransfer: 'eclipse:economy:transfer',
} as const;

export type RpcEventName = (typeof RpcEvent)[keyof typeof RpcEvent];

/** Server -> Client односторонние уведомления. */
export const ServerEvent = {
  SessionState: 'eclipse:session:state',
  Notify: 'eclipse:ui:notify',
  Kick: 'eclipse:session:kick',
} as const;

/** Client -> CEF и CEF -> Client (внутренний мост браузера). */
export const CefEvent = {
  /** CEF сообщает клиенту, что Vue-приложение смонтировано и готово. */
  Ready: 'eclipse:cef:ready',
  /** CEF просит клиент выполнить RPC на сервере. */
  Rpc: 'eclipse:cef:rpc',
  /** Клиент отдаёт CEF ответ на RPC. */
  RpcReply: 'eclipse:cef:rpcReply',
  /** Клиент переключает активный экран в CEF. */
  Screen: 'eclipse:cef:screen',
  /** Клиент шлёт в CEF уведомление. */
  Notify: 'eclipse:cef:notify',
} as const;

/** Служебные события транспортного слоя RPC. */
export const RpcTransport = {
  /** Ответ сервера клиенту: `[requestId, payloadJson]`. */
  Reply: 'eclipse:rpc:reply',
} as const;

/** Таймаут ожидания ответа сервера, мс. */
export const RPC_TIMEOUT_MS = 15_000;
