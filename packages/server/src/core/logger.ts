import type { LogLevel } from './config';

/**
 * Логгер ECLIPSE.
 *
 * Намеренно без внешних зависимостей: рантайм RAGE MP капризен к нативным
 * модулям, а структурного вывода в stdout нам достаточно. Каждый модуль
 * создаёт свой именованный логгер через `createLogger('auth')`, чтобы в
 * консоли всегда было видно, какая подсистема пишет.
 */

const ORDER: Record<LogLevel, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

let threshold = ORDER.debug;

export const setLogLevel = (level: LogLevel): void => {
  threshold = ORDER[level];
};

const stamp = (): string => new Date().toISOString().slice(11, 23);

const write = (level: LogLevel, scope: string, args: unknown[]): void => {
  if (ORDER[level] < threshold) return;
  const prefix = `${stamp()} ${level.toUpperCase().padEnd(5)} [${scope}]`;
  if (level === 'error') console.error(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else console.log(prefix, ...args);
};

export interface Logger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  child(childScope: string): Logger;
}

export const createLogger = (scope: string): Logger => ({
  trace: (...a) => write('trace', scope, a),
  debug: (...a) => write('debug', scope, a),
  info: (...a) => write('info', scope, a),
  warn: (...a) => write('warn', scope, a),
  error: (...a) => write('error', scope, a),
  child: (childScope: string) => createLogger(`${scope}:${childScope}`),
});
