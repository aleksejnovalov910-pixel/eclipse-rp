import {
  AdminLevel,
  ErrorCode,
  SessionState,
  err,
  ok,
  type AccountProfile,
  type AuthSuccess,
  type LoginRequest,
  type RegisterRequest,
  type Result,
} from '@eclipse/shared';
import { loadConfig } from '../../core/config';
import { createLogger } from '../../core/logger';
import type { Session } from '../../core/session';
import { hashPassword, needsRehash, verifyPassword } from './password';
import * as repo from './account.repository';
import { validateEmail, validateLogin, validatePassword } from './account.validation';

const log = createLogger('auth');

const toProfile = (row: repo.AccountRow): AccountProfile => ({
  id: row.id,
  login: row.login,
  adminLevel: row.admin_level as AdminLevel,
  createdAt: row.created_at.toISOString(),
  lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
});

export const login = async (
  session: Session,
  player: PlayerMp,
  request: LoginRequest,
): Promise<Result<AuthSuccess>> => {
  if (session.accountId !== null) return err(ErrorCode.AlreadyAuthenticated);

  const invalid = validateLogin(request?.login) ?? validatePassword(request?.password);
  if (invalid) return invalid;

  const account = await repo.findByLogin(request.login);

  /**
   * Важно: несуществующий аккаунт и неверный пароль возвращают ОДИН И ТОТ ЖЕ
   * код ошибки. Иначе форма входа превращается в инструмент перечисления
   * логинов. По той же причине для отсутствующего аккаунта выполняется
   * фиктивная проверка — чтобы время ответа не отличалось.
   */
  if (!account) {
    await verifyPassword(request.password, DUMMY_HASH);
    await repo.writeAuthLog({
      accountId: null,
      loginAttempted: request.login,
      ip: player.ip,
      socialClub: player.socialClub,
      success: false,
      failureReason: 'account_not_found',
    });
    return err(ErrorCode.InvalidCredentials);
  }

  if (account.banned_until && account.banned_until.getTime() > Date.now()) {
    await repo.writeAuthLog({
      accountId: account.id,
      loginAttempted: request.login,
      ip: player.ip,
      socialClub: player.socialClub,
      success: false,
      failureReason: 'banned',
    });
    return err(ErrorCode.AccountBanned, {
      until: account.banned_until.toISOString(),
      reason: account.ban_reason ?? null,
    });
  }

  const passwordOk = await verifyPassword(request.password, account.password_hash);
  if (!passwordOk) {
    await repo.writeAuthLog({
      accountId: account.id,
      loginAttempted: request.login,
      ip: player.ip,
      socialClub: player.socialClub,
      success: false,
      failureReason: 'wrong_password',
    });
    return err(ErrorCode.InvalidCredentials);
  }

  // Пароль верный — единственный момент, когда можно поднять стоимость хэша.
  if (needsRehash(account.password_hash)) {
    try {
      await repo.updatePasswordHash(account.id, await hashPassword(request.password));
      log.info(`пароль перехэширован под актуальные параметры: account=${account.id}`);
    } catch (error) {
      // Не критично для входа — логируем и продолжаем.
      log.warn(`не удалось перехэшировать пароль account=${account.id}`, error);
    }
  }

  session.accountId = account.id;
  session.state = SessionState.CharacterSelect;

  await repo.markLogin({ accountId: account.id, socialClub: player.socialClub, ip: player.ip });
  await repo.writeAuthLog({
    accountId: account.id,
    loginAttempted: request.login,
    ip: player.ip,
    socialClub: player.socialClub,
    success: true,
    failureReason: null,
  });

  log.info(`вход выполнен: ${account.login} (id=${account.id})`);
  return ok({ account: toProfile(account) });
};

export const register = async (
  session: Session,
  player: PlayerMp,
  request: RegisterRequest,
): Promise<Result<AuthSuccess>> => {
  if (session.accountId !== null) return err(ErrorCode.AlreadyAuthenticated);

  const invalid =
    validateLogin(request?.login) ?? validateEmail(request?.email) ?? validatePassword(request?.password);
  if (invalid) return invalid;

  if (await repo.loginExists(request.login)) return err(ErrorCode.AccountExists, { field: 'login' });
  if (await repo.emailExists(request.email)) return err(ErrorCode.AccountExists, { field: 'email' });

  const passwordHash = await hashPassword(request.password);

  let account: repo.AccountRow;
  try {
    account = await repo.insertAccount({ login: request.login, email: request.email, passwordHash });
  } catch (error) {
    /**
     * Проверка выше — не гарантия: два подключения могут пройти её
     * одновременно. Настоящую защиту даёт UNIQUE-индекс в базе, а здесь мы
     * лишь превращаем нарушение ограничения в человеческую ошибку.
     */
    if (isUniqueViolation(error)) return err(ErrorCode.AccountExists);
    throw error;
  }

  session.accountId = account.id;
  session.state = SessionState.CharacterSelect;

  await repo.markLogin({ accountId: account.id, socialClub: player.socialClub, ip: player.ip });
  log.info(`зарегистрирован аккаунт: ${account.login} (id=${account.id})`);

  return ok({ account: toProfile(account) });
};

/** Код нарушения UNIQUE в PostgreSQL. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';

/**
 * Валидный по формату, но заведомо не совпадающий хэш.
 * Нужен только для выравнивания времени ответа при отсутствующем аккаунте.
 */
const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Экспортируется для будущего использования в админ-панели. */
export const authConfig = () => loadConfig().auth;
