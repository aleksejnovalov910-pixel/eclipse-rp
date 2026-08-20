/**
 * Мост CEF <-> клиент RAGE MP.
 *
 * Направления связи асимметричны, и это надо помнить при отладке:
 *   CEF -> клиент:  mp.trigger(event, ...args)
 *   клиент -> CEF:  browser.execute('window.__eclipse.receive(event, json)')
 *
 * Полезные нагрузки передаются JSON-строками, а не объектами. Причина:
 * клиент собирает вызов `execute` как текст, и передача сериализованной
 * строки исключает поломку на кавычках и любую инъекцию в код страницы.
 *
 * Если `mp` отсутствует (открыли страницу в обычном браузере через
 * `npm run dev:cef`), мост переключается в режим заглушки: интерфейс можно
 * разрабатывать и смотреть без запуска игры.
 */

type Handler = (payload: unknown) => void;

declare global {
  interface Window {
    mp?: { trigger: (event: string, ...args: unknown[]) => void };
    __eclipse?: { receive: (event: string, payloadJson: string) => void };
  }
}

const handlers = new Map<string, Set<Handler>>();

export const isInGame = (): boolean => typeof window.mp?.trigger === 'function';

/** Точка входа для сообщений от клиента. Имя фиксировано — его знает client/core/browser.ts. */
window.__eclipse = {
  receive(event: string, payloadJson: string): void {
    const set = handlers.get(event);
    if (!set || set.size === 0) return;

    let payload: unknown = null;
    try {
      payload = payloadJson ? JSON.parse(payloadJson) : null;
    } catch {
      // Битый payload не должен ронять интерфейс: логируем и продолжаем.
      console.error('[bridge] не удалось разобрать payload события', event);
      return;
    }

    for (const handler of set) {
      try {
        handler(payload);
      } catch (error) {
        // Ошибка одного подписчика не должна отменять доставку остальным.
        console.error('[bridge] ошибка обработчика', event, error);
      }
    }
  },
};

/** Подписка на событие от клиента. Возвращает функцию отписки. */
export const onClient = (event: string, handler: Handler): (() => void) => {
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(event, set);
  return () => set.delete(handler);
};

/** Отправка события клиенту. Вне игры — только запись в консоль. */
export const toClient = (event: string, ...args: unknown[]): void => {
  if (isInGame()) {
    window.mp!.trigger(event, ...args);
    return;
  }
  console.debug('[bridge:dev] ->', event, args);
};
