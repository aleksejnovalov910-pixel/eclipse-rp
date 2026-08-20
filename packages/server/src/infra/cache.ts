import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';

/**
 * Слой кэша с деградацией.
 *
 * На старте проекта Redis не обязателен: одиночному серверу достаточно
 * in-memory реализации. Но интерфейс сразу спроектирован так, чтобы
 * переход на Redis (когда появится второй процесс или внешний веб-сервис)
 * не требовал правок в вызывающем коде.
 *
 * Драйвер Redis намеренно ещё не подключён — см. ECLIPSE_ROADMAP.md,
 * PHASE 5. Пока `REDIS_ENABLED=true` приводит к явному предупреждению,
 * а не к молчаливой подмене поведения.
 */

const log = createLogger('cache');

export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheDriver {
  private readonly store = new Map<string, { value: unknown; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds === undefined ? null : Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let driver: CacheDriver | null = null;

export const cache = (): CacheDriver => {
  if (!driver) {
    const config = loadConfig();
    if (config.redis.enabled) {
      log.warn('REDIS_ENABLED=true, но драйвер Redis ещё не реализован (roadmap PHASE 5). Используется in-memory кэш.');
    }
    driver = new MemoryCache();
    log.info('инициализирован in-memory кэш');
  }
  return driver;
};
