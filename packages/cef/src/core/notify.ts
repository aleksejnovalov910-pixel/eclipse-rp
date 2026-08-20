import { reactive } from 'vue';
import { NotifyType } from '@eclipse/shared';

/**
 * Очередь уведомлений.
 *
 * Одинаковые подряд идущие уведомления не дублируются, а получают счётчик:
 * пять неудачных попыток входа должны дать одну карточку «x5», а не пять
 * карточек, закрывающих экран.
 */

export interface Toast {
  id: number;
  type: NotifyType;
  text: string;
  count: number;
  createdAt: number;
}

const DEFAULT_TTL_MS = 4_000;
const MAX_VISIBLE = 4;

let sequence = 0;

export const toasts = reactive<Toast[]>([]);

const timers = new Map<number, number>();

export const dismiss = (id: number): void => {
  const index = toasts.findIndex((t) => t.id === id);
  if (index !== -1) toasts.splice(index, 1);

  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
};

const schedule = (id: number, ttl: number): void => {
  const existing = timers.get(id);
  if (existing !== undefined) window.clearTimeout(existing);
  timers.set(id, window.setTimeout(() => dismiss(id), ttl));
};

export const notify = (type: NotifyType, text: string, ttl = DEFAULT_TTL_MS): void => {
  const last = toasts[toasts.length - 1];

  if (last && last.type === type && last.text === text) {
    last.count += 1;
    schedule(last.id, ttl);
    return;
  }

  sequence += 1;
  const toast: Toast = { id: sequence, type, text, count: 1, createdAt: Date.now() };
  toasts.push(toast);
  schedule(toast.id, ttl);

  // Экран важнее истории: самое старое уведомление уступает место новому.
  while (toasts.length > MAX_VISIBLE) {
    const oldest = toasts[0];
    if (!oldest) break;
    dismiss(oldest.id);
  }
};

export const notifyError = (text: string): void => notify(NotifyType.Error, text);
export const notifySuccess = (text: string): void => notify(NotifyType.Success, text);
