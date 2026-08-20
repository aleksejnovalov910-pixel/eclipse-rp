import { CefEvent, ErrorCode, RPC_TIMEOUT_MS, type Result } from '@eclipse/shared';
import { onClient, toClient, isInGame } from './bridge';

/**
 * RPC из интерфейса.
 *
 * CEF не общается с сервером напрямую: запрос идёт в клиент, клиент проверяет
 * событие по белому списку и только затем вызывает сервер. Это осознанное
 * ограничение — страница CEF наиболее уязвима к постороннему коду, и она не
 * должна иметь возможности дёрнуть произвольное серверное событие.
 *
 * Любой вызов завершается за конечное время: без таймаута зависший запрос
 * оставил бы кнопку в состоянии вечной загрузки.
 */

interface Pending {
  resolve: (result: Result<unknown>) => void;
  timer: number;
}

const pending = new Map<string, Pending>();
let counter = 0;

const nextId = (): string => {
  counter += 1;
  return `cef-${Date.now().toString(36)}-${counter.toString(36)}`;
};

onClient(CefEvent.RpcReply, (payload) => {
  const { requestId, result } = (payload ?? {}) as { requestId?: string; result?: Result<unknown> };
  if (!requestId) return;

  const entry = pending.get(requestId);
  if (!entry) return; // Ответ на уже истёкший запрос.

  pending.delete(requestId);
  window.clearTimeout(entry.timer);
  entry.resolve(result ?? { ok: false, code: ErrorCode.Internal });
});

export const rpc = <TRes>(event: string, payload: unknown = {}): Promise<Result<TRes>> =>
  new Promise((resolve) => {
    if (!isInGame()) {
      // Режим разработки вне игры: сразу отвечаем ошибкой, чтобы интерфейс
      // показал реальное состояние, а не притворялся работающим.
      resolve({ ok: false, code: ErrorCode.Internal, meta: { reason: 'not_in_game' } });
      return;
    }

    const id = nextId();
    const timer = window.setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, code: ErrorCode.Internal, meta: { reason: 'timeout' } });
    }, RPC_TIMEOUT_MS);

    pending.set(id, { resolve: resolve as (r: Result<unknown>) => void, timer });
    toClient(CefEvent.Rpc, id, event, JSON.stringify(payload));
  });
