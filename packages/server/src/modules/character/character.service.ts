import {
  CHARACTER_SLOTS,
  ErrorCode,
  Gender,
  SessionState,
  err,
  ok,
  type CharacterSummary,
  type CreateCharacterRequest,
  type Result,
} from '@eclipse/shared';
import { createLogger } from '../../core/logger';
import type { Session } from '../../core/session';
import * as repo from './character.repository';
import { withCharacterLock } from './character.state';
import { validateGender, validateName, validateSlot } from './character.validation';

const log = createLogger('character');

/**
 * Приведение строки NUMERIC к числу для интерфейса.
 *
 * Единственное место в проекте, где деньги становятся числом. Внутри сервера
 * они остаются строками, потому что float в финансах — источник расхождений
 * на копейки, которые потом невозможно объяснить игрокам.
 */
const money = (value: string): number => Number.parseFloat(value);

const toSummary = (row: repo.CharacterRow): CharacterSummary => ({
  id: row.id,
  slot: row.slot,
  firstName: row.first_name,
  lastName: row.last_name,
  gender: row.gender as Gender,
  level: row.level,
  playedMinutes: row.played_minutes,
  cash: money(row.cash),
  bank: money(row.bank),
  // Организаций ещё нет — поле останется null до PHASE 4. Заглушку не выдумываем.
  organization: null,
  lastPlayedAt: row.last_played_at ? row.last_played_at.toISOString() : null,
});

/** Список персонажей аккаунта. Требует авторизации. */
export const list = async (session: Session): Promise<Result<CharacterSummary[]>> => {
  if (session.accountId === null) return err(ErrorCode.Unauthorized);

  const rows = await repo.listByAccount(session.accountId);
  return ok(rows.map(toSummary));
};

export const isNameAvailable = async (
  session: Session,
  request: { firstName?: unknown; lastName?: unknown },
): Promise<Result<{ available: boolean }>> => {
  if (session.accountId === null) return err(ErrorCode.Unauthorized);

  const invalid = validateName(request?.firstName, 'firstName') ?? validateName(request?.lastName, 'lastName');
  if (invalid) return invalid;

  const taken = await repo.nameTaken(request.firstName as string, request.lastName as string);
  return ok({ available: !taken });
};

export const create = async (
  session: Session,
  request: CreateCharacterRequest,
): Promise<Result<{ characterId: number }>> => {
  if (session.accountId === null) return err(ErrorCode.Unauthorized);

  const invalid =
    validateSlot(request?.slot) ??
    validateName(request?.firstName, 'firstName') ??
    validateName(request?.lastName, 'lastName') ??
    validateGender(request?.gender);
  if (invalid) return invalid;

  const existing = await repo.listByAccount(session.accountId);
  if (existing.length >= CHARACTER_SLOTS) return err(ErrorCode.CharacterLimitReached);
  if (existing.some((row) => row.slot === request.slot)) return err(ErrorCode.CharacterSlotTaken);

  if (await repo.nameTaken(request.firstName, request.lastName)) {
    return err(ErrorCode.CharacterNameTaken);
  }

  let row: repo.CharacterRow;
  try {
    row = await repo.insertCharacter({
      accountId: session.accountId,
      slot: request.slot,
      firstName: request.firstName,
      lastName: request.lastName,
      gender: request.gender,
    });
  } catch (error) {
    /**
     * Проверки выше — не гарантия: два запроса могут пройти их одновременно.
     * Настоящую защиту дают частичные UNIQUE-индексы (слот и имя среди живых
     * персонажей), а здесь мы переводим нарушение в понятную ошибку.
     */
    if (isUniqueViolation(error, 'characters_name_key')) return err(ErrorCode.CharacterNameTaken);
    if (isUniqueViolation(error, 'characters_account_slot_key')) return err(ErrorCode.CharacterSlotTaken);
    throw error;
  }

  log.info(`создан персонаж ${row.first_name} ${row.last_name} (id=${row.id}, account=${session.accountId})`);
  return ok({ characterId: row.id });
};

export interface SpawnData {
  characterId: number;
  name: string;
  gender: Gender;
  position: { x: number; y: number; z: number };
  heading: number;
  dimension: number;
  health: number;
  armour: number;
}

/**
 * Выбор персонажа для входа в мир.
 *
 * Возвращает данные для спавна, но сам игрока не спавнит: работа с
 * сущностями RAGE MP остаётся в контроллере, а сервис не должен зависеть
 * от игрового API — иначе его невозможно протестировать.
 */
export const select = async (session: Session, characterId: unknown): Promise<Result<SpawnData>> => {
  if (session.accountId === null) return err(ErrorCode.Unauthorized);

  // Повторный вход за персонажа, когда игрок уже в мире, недопустим:
  // это самый прямой путь к дублированию состояния.
  if (session.characterId !== null) return err(ErrorCode.Validation, { reason: 'already_spawned' });

  if (!Number.isInteger(characterId)) return err(ErrorCode.Validation, { field: 'characterId' });

  /**
   * Чтение под той же блокировкой, что и сохранение.
   *
   * Игрок может переподключиться быстрее, чем завершится запись состояния
   * предыдущей сессии. Без ожидания мы прочитали бы устаревшую позицию, а
   * запоздавшее сохранение затёрло бы её обратно.
   */
  const row = await withCharacterLock(characterId as number, () =>
    repo.findOwned(characterId as number, session.accountId as number),
  );
  if (!row) return err(ErrorCode.CharacterNotFound);

  session.characterId = row.id;
  session.state = SessionState.Spawning;

  await repo.markPlayed(row.id);

  log.info(`вход за персонажа ${row.first_name} ${row.last_name} (id=${row.id})`);

  return ok({
    characterId: row.id,
    name: `${row.first_name} ${row.last_name}`,
    gender: row.gender as Gender,
    position: {
      x: Number.parseFloat(row.position_x),
      y: Number.parseFloat(row.position_y),
      z: Number.parseFloat(row.position_z),
    },
    heading: Number.parseFloat(row.heading),
    dimension: row.dimension,
    health: row.health,
    armour: row.armour,
  });
};

/** Нарушение конкретного UNIQUE-индекса в PostgreSQL. */
const isUniqueViolation = (error: unknown, constraint: string): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === '23505' && pgError.constraint === constraint;
};
