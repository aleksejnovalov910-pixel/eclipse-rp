import { SessionState } from '@eclipse/shared';
import { createLogger } from './logger';

/**
 * Реестр игровых сессий.
 *
 * Единственный источник правды о том, кто авторизован и на каком шаге
 * находится. Никакие данные не хранятся в `player.setVariable`, потому что
 * переменные RAGE MP синхронизируются на клиент и не должны содержать
 * серверное состояние.
 *
 * Ключ — `player.id`, но с проверкой по `socialClub`: слоты игроков в
 * RAGE MP переиспользуются после дисконнекта, и без этой проверки новый
 * игрок мог бы унаследовать сессию предыдущего.
 */

const log = createLogger('session');

export interface Session {
  readonly socialClub: string;
  readonly connectedAt: number;
  state: SessionState;
  accountId: number | null;
  characterId: number | null;
  /** Счётчики для rate-limit, ключ — имя действия. */
  readonly counters: Map<string, { count: number; resetAt: number }>;
}

const store = new Map<number, Session>();

const create = (player: PlayerMp): Session => ({
  socialClub: player.socialClub,
  connectedAt: Date.now(),
  state: SessionState.Authenticating,
  accountId: null,
  characterId: null,
  counters: new Map(),
});

export const sessions = {
  open(player: PlayerMp): Session {
    const session = create(player);
    store.set(player.id, session);
    log.debug(`сессия открыта: id=${player.id} sc=${player.socialClub}`);
    return session;
  },

  get(player: PlayerMp | undefined | null): Session | undefined {
    if (!player) return undefined;
    const session = store.get(player.id);
    if (!session) return undefined;
    if (session.socialClub !== player.socialClub) {
      // Слот переиспользован — старая сессия невалидна.
      store.delete(player.id);
      return undefined;
    }
    return session;
  },

  close(player: PlayerMp): Session | undefined {
    const session = store.get(player.id);
    store.delete(player.id);
    if (session) log.debug(`сессия закрыта: id=${player.id} account=${session.accountId ?? 'guest'}`);
    return session;
  },

  /** Все авторизованные сессии — нужно для graceful shutdown и админ-инструментов. */
  authenticated(): Session[] {
    return [...store.values()].filter((s) => s.accountId !== null);
  },

  get size(): number {
    return store.size;
  },
};
