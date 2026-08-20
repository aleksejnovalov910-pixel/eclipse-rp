import { AuthRules, ErrorCode, err, type Err } from '@eclipse/shared';

/**
 * Серверная валидация учётных данных.
 *
 * Клиентская валидация существует только ради UX. Авторитетная — эта.
 * Правила берутся из `@eclipse/shared`, поэтому клиент и сервер физически
 * не могут разойтись в требованиях к полям.
 */

export const validateLogin = (value: unknown): Err | null => {
  if (typeof value !== 'string') return err(ErrorCode.Validation, { field: 'login' });
  if (value.length < AuthRules.login.min || value.length > AuthRules.login.max) {
    return err(ErrorCode.Validation, { field: 'login', min: AuthRules.login.min, max: AuthRules.login.max });
  }
  if (!AuthRules.login.pattern.test(value)) {
    return err(ErrorCode.Validation, { field: 'login', reason: 'pattern' });
  }
  return null;
};

export const validatePassword = (value: unknown): Err | null => {
  if (typeof value !== 'string') return err(ErrorCode.Validation, { field: 'password' });
  if (value.length < AuthRules.password.min || value.length > AuthRules.password.max) {
    return err(ErrorCode.Validation, { field: 'password', min: AuthRules.password.min, max: AuthRules.password.max });
  }
  return null;
};

export const validateEmail = (value: unknown): Err | null => {
  if (typeof value !== 'string') return err(ErrorCode.Validation, { field: 'email' });
  if (value.length > AuthRules.email.max || !AuthRules.email.pattern.test(value)) {
    return err(ErrorCode.Validation, { field: 'email', reason: 'pattern' });
  }
  return null;
};
