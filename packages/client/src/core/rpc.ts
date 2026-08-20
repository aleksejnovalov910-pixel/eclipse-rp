import { RPC_TIMEOUT_MS, RpcTransport, ErrorCode, type Result } from '@eclipse/shared';

/**
 * Клиентская сторона RPC.
 *
 * Каждый вызов получает уникальный идентификатор и промис, который
 * гарантированно завершится: либо ответом сервера, либо таймаутом.
 * Без таймаута зависший запрос оставил бы интерфейс в состоянии вечной
 * загрузки — самый частый источник жалоб «сервер не отвечает».
 */

interface Pending {
  resolve: (result: Result<unknown>) => void;
  timer: number;
}

const pending = new Map<string, Pending>();
let counter = 0;

const nextId = (): string => {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
};

mp.events.add(RpcTransport.Reply, (requestId: string, resultJson: string) => {
  const entry = pending.get(requestId);
  if (!entry) return; // Ответ на уже истёкший запрос — игнорируем.

  pending.delete(requestId);
  clearTimeout(entry.timer);

  try {
    entry.resolve(JSON.parse(resultJson) as Result<unknown>);
  } catch {
    entry.resolve({ ok: false, code: ErrorCode.Internal });
  }
});

export const callServer = <TRes>(event: string, payload: unknown = {}): Promise<Result<TRes>> =>
  new Promise((resolve) => {
    const id = nextId();

    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, code: ErrorCode.Internal, meta: { reason: 'timeout' } });
    }, RPC_TIMEOUT_MS) as unknown as number;

    pending.set(id, { resolve: resolve as (r: Result<unknown>) => void, timer });
    mp.events.callRemote(event, id, JSON.stringify(payload));
  });
