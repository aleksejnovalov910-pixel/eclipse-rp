import { CefEvent, ErrorCode } from '@eclipse/shared';
import { cef } from './browser';
import { callServer } from './rpc';

/**
 * Мост «CEF -> сервер».
 *
 * Интерфейс не вызывает серверные события напрямую. Он просит клиент, а
 * клиент пропускает только то, что явно разрешено. Белый список — не
 * формальность: страница CEF наиболее уязвима к постороннему коду, и без
 * фильтра любой внедрённый скрипт получил бы доступ ко всем событиям
 * сервера, включая те, что появятся в будущем.
 *
 * Обработчик регистрируется РОВНО ОДИН РАЗ, а модули лишь дополняют список
 * разрешённых событий. Иначе каждый новый модуль добавлял бы собственный
 * слушатель того же события, и один запрос из CEF уходил бы на сервер
 * несколько раз.
 */

const allowed = new Set<string>();
let installed = false;

/** Разрешает вызов указанных событий из интерфейса. */
export const allowFromCef = (...events: readonly string[]): void => {
  for (const event of events) allowed.add(event);
};

export const installCefBridge = (): void => {
  if (installed) return;
  installed = true;

  mp.events.add(CefEvent.Rpc, (requestId: string, event: string, payloadJson: string) => {
    if (typeof requestId !== 'string' || typeof event !== 'string') return;

    if (!allowed.has(event)) {
      cef.reply(requestId, { ok: false, code: ErrorCode.Unauthorized });
      return;
    }

    let payload: unknown = {};
    try {
      payload = payloadJson ? JSON.parse(payloadJson) : {};
    } catch {
      cef.reply(requestId, { ok: false, code: ErrorCode.Validation, meta: { reason: 'malformed_payload' } });
      return;
    }

    void callServer(event, payload).then((result) => cef.reply(requestId, result));
  });
};
