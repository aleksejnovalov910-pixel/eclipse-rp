import { ErrorCode } from '@eclipse/shared';

/**
 * Человеческие тексты ошибок.
 *
 * Сервер отдаёт только код. Текст живёт здесь — это позволяет менять
 * формулировки без правок серверной логики и не показывать игроку
 * `TypeError: undefined is not a function`.
 *
 * Формулировки подсказывают следующий шаг, а не констатируют неудачу.
 */
const MESSAGES: Record<string, string> = {
  [ErrorCode.Internal]: 'Не удалось выполнить действие. Попробуйте ещё раз.',
  [ErrorCode.Validation]: 'Проверьте правильность заполнения полей.',
  [ErrorCode.RateLimited]: 'Слишком много попыток. Подождите немного.',
  [ErrorCode.Unauthorized]: 'Действие недоступно. Переподключитесь к серверу.',

  [ErrorCode.AccountNotFound]: 'Аккаунт не найден.',
  [ErrorCode.AccountExists]: 'Такой аккаунт уже существует.',
  [ErrorCode.InvalidCredentials]: 'Неверный логин или пароль.',
  [ErrorCode.AccountBanned]: 'Доступ к аккаунту ограничен.',
  [ErrorCode.AccountLocked]: 'Аккаунт временно заблокирован.',
  [ErrorCode.AlreadyAuthenticated]: 'Вы уже авторизованы.',

  [ErrorCode.CharacterNotFound]: 'Персонаж не найден.',
  [ErrorCode.CharacterSlotTaken]: 'Этот слот уже занят.',
  [ErrorCode.CharacterNameTaken]: 'Персонаж с таким именем уже существует.',
  [ErrorCode.CharacterLimitReached]: 'Достигнут лимит персонажей.',
};

/** Уточнения для случаев, когда общий текст оставил бы игрока в догадках. */
const refine = (code: string, meta?: Record<string, unknown>): string | null => {
  if (!meta) return null;

  if (code === ErrorCode.RateLimited && typeof meta['retryAfterMs'] === 'number') {
    const seconds = Math.ceil(meta['retryAfterMs'] / 1000);
    return `Слишком много попыток. Повторите через ${seconds} с.`;
  }

  if (code === ErrorCode.AccountExists && meta['field'] === 'email') {
    return 'Эта почта уже используется.';
  }

  if (code === ErrorCode.AccountExists && meta['field'] === 'login') {
    return 'Этот логин уже занят.';
  }

  if (code === ErrorCode.Validation && typeof meta['field'] === 'string') {
    const fields: Record<string, string> = {
      login: 'Логин указан неверно.',
      password: 'Пароль не соответствует требованиям.',
      email: 'Проверьте адрес электронной почты.',
      firstName: 'Проверьте имя персонажа.',
      lastName: 'Проверьте фамилию персонажа.',
      slot: 'Некорректный слот персонажа.',
      gender: 'Выберите пол персонажа.',
    };
    return fields[meta['field'] as string] ?? null;
  }

  return null;
};

export const errorText = (code: string, meta?: Record<string, unknown>): string =>
  refine(code, meta) ?? MESSAGES[code] ?? MESSAGES[ErrorCode.Internal]!;
