import type { Generated, ColumnType } from 'kysely';

/**
 * Типизированная схема базы данных для Kysely.
 *
 * Важно: этот файл — зеркало SQL-миграций в `database/migrations`.
 * Схема НЕ генерируется автоматически и НЕ применяется автоматически:
 * источник правды — миграции, а этот файл описывает их результат для
 * компилятора. При добавлении миграции обновите оба места.
 */

/**
 * ВАЖНО: `Generated<Timestamp>` писать нельзя — это вложит ColumnType в
 * ColumnType, и Kysely перестанет разворачивать тип при SELECT. Значение по
 * умолчанию уже выражено через `| undefined` в insert-типе.
 */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type TimestampNullable = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;

export interface AccountsTable {
  id: Generated<number>;
  login: string;
  login_lower: string;
  email: string;
  /** Хэш пароля в формате `scrypt$N$r$p$salt$hash` (см. modules/account/password.ts). */
  password_hash: string;
  admin_level: Generated<number>;
  social_club: string | null;
  last_ip: string | null;
  last_login_at: TimestampNullable;
  banned_until: TimestampNullable;
  ban_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CharactersTable {
  id: Generated<number>;
  account_id: number;
  slot: number;
  first_name: string;
  last_name: string;
  name_lower: string;
  gender: string;
  level: Generated<number>;
  experience: Generated<number>;
  played_minutes: Generated<number>;
  cash: Generated<string>;
  bank: Generated<string>;
  health: Generated<number>;
  armour: Generated<number>;
  position_x: Generated<string>;
  position_y: Generated<string>;
  position_z: Generated<string>;
  heading: Generated<string>;
  dimension: Generated<number>;
  appearance: Generated<unknown>;
  deleted_at: TimestampNullable;
  last_played_at: TimestampNullable;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuthLogTable {
  id: Generated<number>;
  account_id: number | null;
  login_attempted: string;
  ip: string | null;
  social_club: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: Timestamp;
}

export interface MigrationsTable {
  name: string;
  applied_at: Timestamp;
}

export interface Database {
  accounts: AccountsTable;
  characters: CharactersTable;
  auth_log: AuthLogTable;
  _migrations: MigrationsTable;
}
