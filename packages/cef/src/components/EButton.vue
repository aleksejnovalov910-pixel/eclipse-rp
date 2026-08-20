<script setup lang="ts">
/**
 * Кнопка ECLIPSE.
 *
 * Состояние загрузки встроено намеренно: почти каждая кнопка в проекте
 * запускает сетевой запрос, и без встроенного `loading` каждый экран изобретал
 * бы собственную защиту от повторного нажатия. Здесь она одна и обязательная —
 * во время загрузки кнопка не кликается, что закрывает класс багов с двойной
 * покупкой и двойной регистрацией.
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: 'button' | 'submit';
  }>(),
  { variant: 'primary', loading: false, disabled: false, block: false, type: 'button' },
);
</script>

<template>
  <button
    :type="type"
    class="e-btn"
    :class="[`e-btn--${variant}`, { 'e-btn--block': block, 'e-btn--loading': loading }]"
    :disabled="disabled || loading"
  >
    <span class="e-btn__label"><slot /></span>
    <span v-if="loading" class="e-btn__spinner" aria-hidden="true" />
  </button>
</template>

<style scoped>
.e-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--e-space-2);
  min-height: 42px;
  padding: 0 var(--e-space-5);
  border: 1px solid transparent;
  border-radius: var(--e-radius-md);
  font-size: var(--e-text-sm);
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background var(--e-fast) var(--e-ease),
    border-color var(--e-fast) var(--e-ease),
    transform var(--e-fast) var(--e-ease),
    box-shadow var(--e-fast) var(--e-ease);
}

.e-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.e-btn:not(:disabled):active {
  transform: translateY(1px);
}

.e-btn--primary {
  background: var(--e-accent);
  color: #180d05;
  box-shadow: 0 6px 20px var(--e-accent-glow);
}
.e-btn--primary:not(:disabled):hover {
  background: var(--e-accent-strong);
}

.e-btn--ghost {
  background: var(--e-surface-1);
  border-color: var(--e-border);
  color: var(--e-text-secondary);
}
.e-btn--ghost:not(:disabled):hover {
  background: var(--e-surface-2);
  border-color: var(--e-border-strong);
  color: var(--e-text-primary);
}

.e-btn--danger {
  background: transparent;
  border-color: rgba(255, 95, 109, 0.4);
  color: var(--e-error);
}
.e-btn--danger:not(:disabled):hover {
  background: rgba(255, 95, 109, 0.12);
}

.e-btn--block {
  width: 100%;
}

/* Во время загрузки подпись скрывается, но занимает место — иначе кнопка
   меняла бы ширину и «прыгала» под курсором. */
.e-btn--loading .e-btn__label {
  visibility: hidden;
}

.e-btn__spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: e-btn-spin 620ms linear infinite;
}

@keyframes e-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .e-btn__spinner {
    animation-duration: 1.6s;
  }
}
</style>
