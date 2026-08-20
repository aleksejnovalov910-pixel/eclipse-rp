import { CefEvent } from '@eclipse/shared';

/**
 * Менеджер CEF-браузера.
 *
 * Ровно один браузер на весь клиент. Разные интерфейсы — это разные экраны
 * внутри одного Vue-приложения, а не отдельные CEF-инстансы: каждый
 * дополнительный браузер стоит памяти и кадров, и именно множащиеся
 * браузеры чаще всего превращают RP-сборку в слайд-шоу.
 *
 * Сообщения, отправленные до готовности Vue-приложения, буферизуются и
 * доставляются после события Ready.
 */

const CEF_URL = 'package://eclipse/cef/index.html';

let browser: BrowserMp | null = null;
let cefReady = false;
const queue: string[] = [];

const flush = (): void => {
  if (!browser) return;
  while (queue.length > 0) {
    const call = queue.shift();
    if (call) browser.execute(call);
  }
};

/** Безопасно передаёт данные в CEF: сериализация исключает инъекцию в execute. */
const send = (event: string, payload: unknown): void => {
  const call = `window.__eclipse && window.__eclipse.receive(${JSON.stringify(event)}, ${JSON.stringify(
    JSON.stringify(payload),
  )})`;

  if (browser && cefReady) browser.execute(call);
  else queue.push(call);
};

export const cef = {
  create(): void {
    if (browser) return;
    browser = mp.browsers.new(CEF_URL);

    mp.events.add(CefEvent.Ready, () => {
      cefReady = true;
      flush();
    });
  },

  /** Переключает активный экран интерфейса. */
  screen(name: string, data: unknown = null): void {
    send(CefEvent.Screen, { name, data });
  },

  notify(type: string, text: string): void {
    send(CefEvent.Notify, { type, text });
  },

  reply(requestId: string, result: unknown): void {
    send(CefEvent.RpcReply, { requestId, result });
  },

  /**
   * Управление курсором и вводом.
   * Всегда парой: показать курсор без блокировки управления — верный способ
   * получить игрока, который «печатает» и одновременно бежит вперёд.
   */
  focus(enabled: boolean): void {
    mp.gui.cursor.show(enabled, enabled);
    mp.game.ui.displayRadar(!enabled);
  },

  destroy(): void {
    if (!browser) return;
    browser.destroy();
    browser = null;
    cefReady = false;
    queue.length = 0;
  },
};
