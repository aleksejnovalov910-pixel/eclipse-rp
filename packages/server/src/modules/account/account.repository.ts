import { db } from '../../infra/db';

/**
 * Доступ к данным аккаунтов.
 *
 * Репозиторий не знает ничего об игроках RAGE MP и не содержит бизнес-правил.
 * Его единственная задача — SQL. Это позволяет тестировать сервис отдельно
 * и не тащить игровой контекст в слой данных.
 */

export interface AccountRow {
  id: number;
  login: string;
  email: string;
  password_hash: string;
  admin_level: number;
  banned_until: Date | null;
  ban_reason: string | null;
  created_at: Date;
  last_login_at: Date | null;
}

/** Поиск по нормализованному логину: регистр не должен создавать два аккаунта. */
export const findByLogin = async (login: string): Promise<AccountRow | undefined> =>
  db()
    .selectFrom('accounts')
    .select([
      'id',
      'login',
      'email',
      'password_hash',
      'admin_level',
      'banned_until',
      'ban_reason',
      'created_at',
      'last_login_at',
    ])
    .where('login_lower', '=', login.toLowerCase())
    .executeTakeFirst() as Promise<AccountRow | undefined>;

export const loginExists = async (login: string): Promise<boolean> => {
  const row = await db()
    .selectFrom('accounts')
    .select('id')
    .where('login_lower', '=', login.toLowerCase())
    .executeTakeFirst();
  return row !== undefined;
};

export const emailExists = async (email: string): Promise<boolean> => {
  const row = await db()
    .selectFrom('accounts')
    .select('id')
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst();
  return row !== undefined;
};

export const insertAccount = async (params: {
  login: string;
  email: string;
  passwordHash: string;
}): Promise<AccountRow> =>
  db()
    .insertInto('accounts')
    .values({
      login: params.login,
      login_lower: params.login.toLowerCase(),
      email: params.email.toLowerCase(),
      password_hash: params.passwordHash,
    })
    .returning([
      'id',
      'login',
      'email',
      'password_hash',
      'admin_level',
      'banned_until',
      'ban_reason',
      'created_at',
      'last_login_at',
    ])
    .executeTakeFirstOrThrow() as Promise<AccountRow>;

export const updatePasswordHash = async (accountId: number, passwordHash: string): Promise<void> => {
  await db()
    .updateTable('accounts')
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where('id', '=', accountId)
    .execute();
};

export const markLogin = async (params: {
  accountId: number;
  socialClub: string;
  ip: string;
}): Promise<void> => {
  await db()
    .updateTable('accounts')
    .set({
      last_login_at: new Date(),
      last_ip: params.ip,
      social_club: params.socialClub,
      updated_at: new Date(),
    })
    .where('id', '=', params.accountId)
    .execute();
};

/**
 * Журнал попыток входа.
 *
 * Пишется и для успеха, и для провала: без этого невозможно ни расследовать
 * компрометацию аккаунта, ни отличить забывчивого игрока от перебора.
 * Пароль здесь, разумеется, не сохраняется ни в каком виде.
 */
export const writeAuthLog = async (params: {
  accountId: number | null;
  loginAttempted: string;
  ip: string | null;
  socialClub: string | null;
  success: boolean;
  failureReason: string | null;
}): Promise<void> => {
  await db()
    .insertInto('auth_log')
    .values({
      account_id: params.accountId,
      login_attempted: params.loginAttempted.slice(0, 64),
      ip: params.ip,
      social_club: params.socialClub,
      success: params.success,
      failure_reason: params.failureReason,
    })
    .execute();
};
