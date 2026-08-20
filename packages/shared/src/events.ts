/**
 * Контракт событий ECLIPSE.
 * Соглашение: `eclipse:<домен>:<действие>`.
 */
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

  InventoryGet: 'eclipse:inventory:get',
  InventoryMove: 'eclipse:inventory:move',
  InventorySplit: 'eclipse:inventory:split',

  JobProgress: 'eclipse:jobs:progress',
} as const;

export type RpcEventName = (typeof RpcEvent)[keyof typeof RpcEvent];

export const ServerEvent = {
  SessionState: 'eclipse:session:state',
  Notify: 'eclipse:ui:notify',
  Kick: 'eclipse:session:kick',
} as const;

export const CefEvent = {
  Ready: 'eclipse:cef:ready',
  Rpc: 'eclipse:cef:rpc',
  RpcReply: 'eclipse:cef:rpcReply',
  Screen: 'eclipse:cef:screen',
  Notify: 'eclipse:cef:notify',
} as const;

export const RpcTransport = {
  Reply: 'eclipse:rpc:reply',
} as const;

export const RPC_TIMEOUT_MS = 15_000;
