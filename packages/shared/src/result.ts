export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; code: ErrorCode; meta?: Record<string, unknown> };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = (code: ErrorCode, meta?: Record<string, unknown>): Err =>
  meta ? { ok: false, code, meta } : { ok: false, code };

export enum ErrorCode {
  Internal = 'INTERNAL',
  Validation = 'VALIDATION',
  RateLimited = 'RATE_LIMITED',
  Unauthorized = 'UNAUTHORIZED',

  AccountNotFound = 'ACCOUNT_NOT_FOUND',
  AccountExists = 'ACCOUNT_EXISTS',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  AccountBanned = 'ACCOUNT_BANNED',
  AccountLocked = 'ACCOUNT_LOCKED',
  AlreadyAuthenticated = 'ALREADY_AUTHENTICATED',

  CharacterNotFound = 'CHARACTER_NOT_FOUND',
  CharacterSlotTaken = 'CHARACTER_SLOT_TAKEN',
  CharacterNameTaken = 'CHARACTER_NAME_TAKEN',
  CharacterLimitReached = 'CHARACTER_LIMIT_REACHED',

  InvalidAmount = 'INVALID_AMOUNT',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  SameAccount = 'SAME_ACCOUNT',

  InventoryNotFound = 'INVENTORY_NOT_FOUND',
  InventoryItemNotFound = 'INVENTORY_ITEM_NOT_FOUND',
  InventorySlotOccupied = 'INVENTORY_SLOT_OCCUPIED',
  InventoryInvalidSlot = 'INVENTORY_INVALID_SLOT',
  InventoryInvalidQuantity = 'INVENTORY_INVALID_QUANTITY',

  AlreadyInFamily = 'ALREADY_IN_FAMILY',
  FamilyNameTaken = 'FAMILY_NAME_TAKEN',
}
