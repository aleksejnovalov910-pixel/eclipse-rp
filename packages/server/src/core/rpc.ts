import { ErrorCode, RpcTransport, err, type Result } from '@eclipse/shared';
import { createLogger } from './logger';
import type { Session } from './session';
import { sessions } from './session';

/**
 * Транспорт RPC на стороне сервера.
 *
 * Почему свой, а не готовая библиотека: нам нужен ровно один инвариант —
 * обработчик никогда не может уронить сервер и никогда не может отдать
 * наружу исключение. Любой throw превращается в `ErrorCode.Internal`,
 * а настоящая причина уходит в лог с идентификатором игрока.
 *
 * Формат события от клиента: (player, requestId: string, payloadJson: string)
 * Формат ответа клиенту:      (requestId: string, resultJson: string)
 */

const log = createLogger('rpc');

export type RpcHandler<TReq, TRes> = (ctx: RpcContext, payload: TReq) => Promise<Result<TRes>> | Result<TRes>;

export interface RpcContext {
  readonly player: PlayerMp;
  readonly session: Session;
}

const registered = new Set<string>();

const reply = (player: PlayerMp, requestId: string, result: Result<unknown>): void => {
  if (!mp.players.exists(player)) return;
  player.call(RpcTransport.Reply, [requestId, JSON.stringify(result)]);
};

/**
 * Регистрирует обработчик RPC.
 *
 * Повторная регистрация одного и того же события — ошибка проектирования
 * (два независимых модуля незаметно перетирают друг друга), поэтому мы
 * падаем громко на старте, а не отлаживаем это в проде.
 */
export const onRpc = <TReq, TRes>(event: string, handler: RpcHandler<TReq, TRes>): void => {
  if (registered.has(event)) {
    throw new Error(`[rpc] Обработчик события "${event}" уже зарегистрирован. Дубликаты запрещены.`);
  }
  registered.add(event);

  mp.events.add(event, (player: PlayerMp, requestId: unknown, payloadJson: unknown) => {
    void handleCall(event, handler as RpcHandler<unknown, unknown>, player, requestId, payloadJson);
  });

  log.debug(`зарегистрирован обработчик: ${event}`);
};

const handleCall = async (
  event: string,
  handler: RpcHandler<unknown, unknown>,
  player: PlayerMp,
  requestId: unknown,
  payloadJson: unknown,
): Promise<void> => {
  if (typeof requestId !== 'string') {
    log.warn(`${event}: получен некорректный requestId от игрока ${player?.socialClub ?? '?'}`);
    return;
  }

  const session = sessions.get(player);
  if (!session) {
    // Сессия создаётся в playerJoin. Её отсутствие означает либо гонку при
    // подключении, либо попытку вызвать RPC в обход клиента.
    log.warn(`${event}: RPC без активной сессии, запрос отклонён`);
    reply(player, requestId, err(ErrorCode.Unauthorized));
    return;
  }

  let payload: unknown;
  try {
    payload = typeof payloadJson === 'string' && payloadJson.length > 0 ? JSON.parse(payloadJson) : {};
  } catch {
    reply(player, requestId, err(ErrorCode.Validation, { reason: 'malformed_payload' }));
    return;
  }

  try {
    const result = await handler({ player, session }, payload);
    reply(player, requestId, result);
  } catch (error) {
    // Наружу — только код. Причина остаётся здесь.
    log.error(`${event}: необработанное исключение (account=${session.accountId ?? 'guest'})`, error);
    reply(player, requestId, err(ErrorCode.Internal));
  }
};
