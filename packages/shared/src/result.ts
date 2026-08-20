/**
 * Единый формат ответа для всех RPC-вызовов ECLIPSE.
 *
 * Правило проекта: сервер НИКОГДА не бросает сырое исключение в сторону
 * клиента и никогда не отдаёт наружу stack trace. Любая ошибка приводится
 * к машиночитаемому коду (`ErrorCode`), по которому CEF сам выбирает текст.
 * Это позволяет локализовать интерфейс и не утекать деталями реализации.
 */
export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; code: ErrorCode; meta?: Record<string, unknown> };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = (code: ErrorCode, meta?: Record<string, unknown>): Err =>
  meta ? { ok: false, code, meta } : { ok: false, code };

export enum ErrorCode {
  /** Непредвиденный сбой на сервере. Детали остаются в серверных логах. */
  Internal = 'INTERNAL',
  /** Данные не прошли валидацию. */
  Validation = 'VALIDATION',
  /** Слишком частые запросы от игрока. */
  RateLimited = 'RATE_LIMITED',
  /** Действие требует авторизации, но сессия не установлена. */
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
}
