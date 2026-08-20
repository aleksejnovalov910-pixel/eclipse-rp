import { CHARACTER_SLOTS, CharacterRules, ErrorCode, Gender, err, type Err } from '@eclipse/shared';

/**
 * Серверная валидация данных персонажа.
 *
 * Правила общие с клиентом (@eclipse/shared), но проверка здесь —
 * единственная авторитетная: клиент может быть модифицирован.
 */

export const validateName = (value: unknown, field: 'firstName' | 'lastName'): Err | null => {
  if (typeof value !== 'string') return err(ErrorCode.Validation, { field });

  if (value.length < CharacterRules.name.min || value.length > CharacterRules.name.max) {
    return err(ErrorCode.Validation, {
      field,
      min: CharacterRules.name.min,
      max: CharacterRules.name.max,
    });
  }

  if (!CharacterRules.name.pattern.test(value)) {
    return err(ErrorCode.Validation, { field, reason: 'pattern' });
  }

  return null;
};

export const validateSlot = (value: unknown): Err | null => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) >= CHARACTER_SLOTS) {
    return err(ErrorCode.Validation, { field: 'slot' });
  }
  return null;
};

export const validateGender = (value: unknown): Err | null => {
  if (value !== Gender.Male && value !== Gender.Female) {
    return err(ErrorCode.Validation, { field: 'gender' });
  }
  return null;
};
