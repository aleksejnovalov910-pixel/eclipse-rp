<script setup lang="ts">
import { NotifyType } from '@eclipse/shared';
import { toasts, dismiss } from '../core/notify';

/**
 * Слой уведомлений. Всегда смонтирован, всегда поверх остальных экранов.
 * Клики по нему проходят насквозь везде, кроме самих карточек.
 */
const ICONS: Record<NotifyType, string> = {
  [NotifyType.Info]: 'i',
  [NotifyType.Success]: '✓',
  [NotifyType.Warning]: '!',
  [NotifyType.Error]: '×',
};
</script>

<template>
  <div class="e-toasts">
    <TransitionGroup name="e-toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="e-toast e-interactive"
        :class="`e-toast--${toast.type}`"
        @click="dismiss(toast.id)"
      >
        <span class="e-toast__icon">{{ ICONS[toast.type] }}</span>
        <span class="e-toast__text">{{ toast.text }}</span>
        <span v-if="toast.count > 1" class="e-toast__count">×{{ toast.count }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.e-toasts {
  position: fixed;
  top: var(--e-space-5);
  right: var(--e-space-5);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: var(--e-space-2);
  width: 340px;
}

.e-toast {
  display: flex;
  align-items: center;
  gap: var(--e-space-3);
  padding: var(--e-space-3) var(--e-space-4);
  background: rgba(14, 16, 22, 0.92);
  border: 1px solid var(--e-border);
  border-left: 3px solid var(--e-info);
  border-radius: var(--e-radius-md);
  box-shadow: var(--e-shadow-md);
  backdrop-filter: blur(var(--e-blur));
  cursor: pointer;
}

.e-toast--success {
  border-left-color: var(--e-success);
}
.e-toast--warning {
  border-left-color: var(--e-warning);
}
.e-toast--error {
  border-left-color: var(--e-error);
}

.e-toast__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--e-surface-2);
  font-size: var(--e-text-xs);
  font-weight: 700;
}

.e-toast--success .e-toast__icon {
  color: var(--e-success);
}
.e-toast--warning .e-toast__icon {
  color: var(--e-warning);
}
.e-toast--error .e-toast__icon {
  color: var(--e-error);
}
.e-toast--info .e-toast__icon {
  color: var(--e-info);
}

.e-toast__text {
  flex: 1;
  font-size: var(--e-text-sm);
  color: var(--e-text-secondary);
}

.e-toast__count {
  flex-shrink: 0;
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
  font-variant-numeric: tabular-nums;
}

.e-toast-enter-active,
.e-toast-leave-active {
  transition:
    opacity var(--e-normal) var(--e-ease-out),
    transform var(--e-normal) var(--e-ease-out);
}
.e-toast-enter-from,
.e-toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.e-toast-move {
  transition: transform var(--e-normal) var(--e-ease-out);
}
</style>
