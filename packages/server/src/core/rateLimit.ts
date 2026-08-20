import { ErrorCode, err, type Err } from '@eclipse/shared';
import type { Session } from './session';

/**
 * Простой per-session rate limit со скользящим окном фиксированной длины.
 *
 * Зачем: любое действие, доступное из CEF, может быть вызвано в цикле
 * скриптом. Особенно чувствительны вход, регистрация и любые операции,
 * которые бьют в базу. Лимит хранится в сессии, поэтому автоматически
 * исчезает при дисконнекте и не требует внешнего хранилища.
 */
export interface LimitRule {
  /** Максимум попыток за окно. */
  readonly max: number;
  /** Длина окна в миллисекундах. */
  readonly windowMs: number;
}

export const consume = (session: Session, action: string, rule: LimitRule): Err | null => {
  const now = Date.now();
  const entry = session.counters.get(action);

  if (!entry || now >= entry.resetAt) {
    session.counters.set(action, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }

  if (entry.count >= rule.max) {
    return err(ErrorCode.RateLimited, { retryAfterMs: entry.resetAt - now });
  }

  entry.count += 1;
  return null;
};

/** Сбрасывает счётчик — например, после успешного входа. */
export const reset = (session: Session, action: string): void => {
  session.counters.delete(action);
};
