import { SessionState } from '@eclipse/shared';
import { createLogger } from '../../core/logger';
import { sessions, type Session } from '../../core/session';
import * as repo from './character.repository';

/**
 * Сохранение игрового состояния персонажа.
 *
 * ЧТО СОХРАНЯЕТСЯ ЗДЕСЬ, А ЧТО НЕТ
 *
 * Сохраняется только состояние мира: позиция, поворот, измерение, здоровье,
 * броня и наигранное время. Деньги, инвентарь и любые ценности намеренно
 * НЕ входят в снимок.
 *
 * Причина не косметическая. Снимок состояния снимается в момент выхода и
 * записывается через UPDATE. Если в него добавить деньги, появляется классовая
 * дыра: игрок переводит деньги другому, отключается, и устаревший снимок
 * возвращает ему прежний баланс — деньги удвоились. Именно так на RP-серверах
 * появляются дюпы валюты.
 *
 * Поэтому граница проведена по владению данными:
 *   * состояние мира живёт в игровой сущности, база лишь его отражает —
 *     снимок здесь авторитетен;
 *   * деньги и предметы живут в базе, игровая сущность их лишь отображает —
 *     менять их можно только транзакцией в момент операции.
 *
 * ГОНКИ
 *
 * Игрок может переподключиться быстрее, чем завершится сохранение предыдущей
 * сессии. Тогда загрузка прочитала бы устаревшие данные, а последующая запись
 * затёрла бы новые. Поэтому все операции с одним персонажем выстраиваются в
 * очередь через блокировку по characterId — и сохранение, и чтение при входе.
 */

const log = createLogger('character:state');

/** Снимок состояния. Обычные числа, никаких ссылок на сущности RAGE MP. */
export interface StateSnapshot {
  characterId: number;
  position: { x: number; y: number; z: number } | null;
  heading: number | null;
  dimension: number | null;
  health: number | null;
  armour: number | null;
  /** Целые минуты, которые нужно прибавить к наигранному времени. */
  playedMinutes: number;
}

// ---------- блокировки по персонажу ----------

const locks = new Map<number, Promise<unknown>>();

/**
 * Выполняет операцию эксклюзивно для конкретного персонажа.
 *
 * Очередь строится цепочкой промисов. Ошибка одной операции не должна рвать
 * цепочку для следующих, поэтому звено всегда завершается успешно, а обработка
 * ошибки остаётся на вызывающей стороне.
 */
export const withCharacterLock = async <T>(characterId: number, operation: () => Promise<T>): Promise<T> => {
  const previous = locks.get(characterId) ?? Promise.resolve();

  const current = previous.then(operation, operation);
  // Звено очереди, которое никогда не отклоняется.
  locks.set(
    characterId,
    current.then(
      () => undefined,
      () => undefined,
    ),
  );

  try {
    return await current;
  } finally {
    // Снимаем блокировку, только если следующей операции не появилось.
    if (locks.get(characterId) === undefined) locks.delete(characterId);
  }
};

// ---------- снятие снимка ----------

/**
 * Снимает состояние с игровой сущности.
 *
 * ВАЖНО: вызывать синхронно, до любого await. В обработчике playerQuit
 * сущность игрока ещё валидна, но после первой асинхронной паузы обращение к
 * ней может выбросить исключение или вернуть мусор.
 */
export const snapshot = (player: PlayerMp, session: Session): StateSnapshot | null => {
  if (session.characterId === null) return null;

  const result: StateSnapshot = {
    characterId: session.characterId,
    position: null,
    heading: null,
    dimension: null,
    health: null,
    armour: null,
    playedMinutes: takePlayedMinutes(session),
  };

  try {
    const position = player.position;
    result.position = { x: position.x, y: position.y, z: position.z };
    result.heading = player.heading;
    result.dimension = player.dimension;
    result.health = clamp(player.health, 0, 100);
    result.armour = clamp(player.armour, 0, 100);
  } catch (error) {
    /**
     * Сущность уже недоступна — например, игрок вылетел по таймауту.
     * Позицию потеряли, но наигранное время сохранить всё ещё можно и нужно.
     */
    log.warn(`не удалось снять состояние мира для персонажа ${session.characterId}`, error);
  }

  return result;
};

/**
 * Отдаёт накопленные целые минуты и переносит точку отсчёта вперёд ровно на
 * них. Остаток секунд не теряется — он учтётся в следующем сохранении.
 */
const takePlayedMinutes = (session: Session): number => {
  if (session.playedAccountedAt === null) return 0;

  const elapsedMs = Date.now() - session.playedAccountedAt;
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes <= 0) return 0;

  session.playedAccountedAt += minutes * 60_000;
  return minutes;
};

const clamp = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;

// ---------- запись ----------

/** Записывает снимок в базу. Пустой снимок (нечего сохранять) пропускается. */
export const persist = async (state: StateSnapshot): Promise<void> => {
  const hasWorldState = state.position !== null;
  if (!hasWorldState && state.playedMinutes === 0) return;

  await withCharacterLock(state.characterId, async () => {
    await repo.saveState(state);
  });
};

/** Снимает и сохраняет состояние одного игрока. */
export const save = async (player: PlayerMp, session: Session): Promise<void> => {
  const state = snapshot(player, session);
  if (!state) return;
  await persist(state);
};

// ---------- автосохранение ----------

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Периодическое сохранение всех играющих.
 *
 * Нужно не ради частых записей, а ради краша: при падении процесса обработчик
 * выхода не выполнится, и без автосохранения игроки потеряют весь прогресс с
 * момента входа.
 *
 * Снимки всех игроков снимаются синхронно одним проходом, и только потом
 * пишутся в базу. Иначе между записями успевает пройти время, и часть снимков
 * оказывается снята уже после первых await.
 */
export const startAutosave = (intervalSeconds: number): void => {
  if (timer !== null) return;
  if (intervalSeconds <= 0) {
    log.warn('автосохранение отключено конфигурацией');
    return;
  }

  timer = setInterval(() => {
    void saveAll('автосохранение');
  }, intervalSeconds * 1000);

  log.info(`автосохранение включено, интервал ${intervalSeconds} с`);
};

export const stopAutosave = (): void => {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
};

/** Сохраняет всех, кто сейчас в мире. Используется автосохранением и остановкой сервера. */
export const saveAll = async (reason: string): Promise<number> => {
  const snapshots: StateSnapshot[] = [];

  for (const { player, session } of sessions.playing()) {
    const state = snapshot(player, session);
    if (state) snapshots.push(state);
  }

  if (snapshots.length === 0) return 0;

  const outcomes = await Promise.allSettled(snapshots.map(persist));
  const failed = outcomes.filter((outcome) => outcome.status === 'rejected');

  for (const outcome of failed) {
    log.error(`${reason}: сохранение не удалось`, (outcome as PromiseRejectedResult).reason);
  }

  const saved = snapshots.length - failed.length;
  log.info(`${reason}: сохранено персонажей ${saved} из ${snapshots.length}`);
  return saved;
};

/** Отмечает момент входа в мир — с него начинается отсчёт наигранного времени. */
export const beginTracking = (session: Session): void => {
  session.playedAccountedAt = Date.now();
  session.state = SessionState.Playing;
};
