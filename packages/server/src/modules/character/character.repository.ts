import { db } from '../../infra/db';
import { DEFAULT_SPAWN, STARTING_BANK, STARTING_CASH } from '../../config/world';

/**
 * Доступ к данным персонажей.
 *
 * Денежные поля приходят из PostgreSQL строками (NUMERIC читается как
 * строка — см. infra/db.ts), и здесь они строками и остаются. Приведение к
 * числу выполняется только на границе отправки в интерфейс: внутри сервера
 * деньги никогда не должны становиться float.
 */

export interface CharacterRow {
  id: number;
  account_id: number;
  slot: number;
  first_name: string;
  last_name: string;
  gender: string;
  level: number;
  played_minutes: number;
  cash: string;
  bank: string;
  health: number;
  armour: number;
  position_x: string;
  position_y: string;
  position_z: string;
  heading: string;
  dimension: number;
  last_played_at: Date | null;
}

const COLUMNS = [
  'id',
  'account_id',
  'slot',
  'first_name',
  'last_name',
  'gender',
  'level',
  'played_minutes',
  'cash',
  'bank',
  'health',
  'armour',
  'position_x',
  'position_y',
  'position_z',
  'heading',
  'dimension',
  'last_played_at',
] as const;

/** Живые персонажи аккаунта, по слотам. Удалённые (deleted_at) не возвращаются. */
export const listByAccount = async (accountId: number): Promise<CharacterRow[]> =>
  db()
    .selectFrom('characters')
    .select(COLUMNS)
    .where('account_id', '=', accountId)
    .where('deleted_at', 'is', null)
    .orderBy('slot', 'asc')
    .execute() as unknown as Promise<CharacterRow[]>;

export const findOwned = async (characterId: number, accountId: number): Promise<CharacterRow | undefined> =>
  db()
    .selectFrom('characters')
    .select(COLUMNS)
    .where('id', '=', characterId)
    // Принадлежность аккаунту проверяется в самом запросе: так невозможно
    // забыть проверку в вызывающем коде и войти за чужого персонажа.
    .where('account_id', '=', accountId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst() as unknown as Promise<CharacterRow | undefined>;

export const nameTaken = async (firstName: string, lastName: string): Promise<boolean> => {
  const row = await db()
    .selectFrom('characters')
    .select('id')
    .where('name_lower', '=', nameKey(firstName, lastName))
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  return row !== undefined;
};

export const insertCharacter = async (params: {
  accountId: number;
  slot: number;
  firstName: string;
  lastName: string;
  gender: string;
}): Promise<CharacterRow> =>
  db()
    .insertInto('characters')
    .values({
      account_id: params.accountId,
      slot: params.slot,
      first_name: params.firstName,
      last_name: params.lastName,
      name_lower: nameKey(params.firstName, params.lastName),
      gender: params.gender,
      cash: String(STARTING_CASH),
      bank: String(STARTING_BANK),
      position_x: String(DEFAULT_SPAWN.x),
      position_y: String(DEFAULT_SPAWN.y),
      position_z: String(DEFAULT_SPAWN.z),
      heading: String(DEFAULT_SPAWN.heading),
      dimension: DEFAULT_SPAWN.dimension,
    })
    .returning(COLUMNS)
    .executeTakeFirstOrThrow() as unknown as Promise<CharacterRow>;

/**
 * Запись состояния мира и наигранного времени.
 *
 * Наигранное время прибавляется выражением `played_minutes + N`, а не
 * присваиванием посчитанного значения: иначе параллельная запись из другого
 * источника была бы потеряна. Деньги здесь не участвуют — см. character.state.ts.
 */
export const saveState = async (state: {
  characterId: number;
  position: { x: number; y: number; z: number } | null;
  heading: number | null;
  dimension: number | null;
  health: number | null;
  armour: number | null;
  playedMinutes: number;
}): Promise<void> => {
  await db()
    .updateTable('characters')
    .set((eb) => {
      const values: Record<string, unknown> = { updated_at: new Date() };

      if (state.position) {
        values['position_x'] = String(state.position.x.toFixed(3));
        values['position_y'] = String(state.position.y.toFixed(3));
        values['position_z'] = String(state.position.z.toFixed(3));
      }
      if (state.heading !== null) values['heading'] = String(state.heading.toFixed(2));
      if (state.dimension !== null) values['dimension'] = state.dimension;
      if (state.health !== null) values['health'] = state.health;
      if (state.armour !== null) values['armour'] = state.armour;

      if (state.playedMinutes > 0) {
        values['played_minutes'] = eb('played_minutes', '+', state.playedMinutes);
      }

      return values as never;
    })
    .where('id', '=', state.characterId)
    .where('deleted_at', 'is', null)
    .execute();
};

export const markPlayed = async (characterId: number): Promise<void> => {
  await db()
    .updateTable('characters')
    .set({ last_played_at: new Date(), updated_at: new Date() })
    .where('id', '=', characterId)
    .execute();
};

/** Ключ уникальности имени: регистр не должен порождать «John Doe» и «john doe». */
export const nameKey = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`.toLowerCase();
