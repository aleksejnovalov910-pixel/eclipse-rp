<script setup lang="ts">
/**
 * Поле ввода с подписью и слотом ошибки.
 *
 * Ошибка резервирует место всегда, даже когда её нет. Это выглядит как
 * мелочь, но именно из-за её отсутствия форма подпрыгивает при первой
 * неудачной попытке входа и игрок промахивается по кнопке.
 */
withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    type?: 'text' | 'password';
    placeholder?: string;
    error?: string | null;
    autofocus?: boolean;
    maxlength?: number;
    disabled?: boolean;
  }>(),
  { type: 'text', placeholder: '', error: null, autofocus: false, maxlength: 64, disabled: false },
);

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label class="e-field" :class="{ 'e-field--invalid': !!error }">
    <span class="e-field__label">{{ label }}</span>
    <input
      class="e-field__input"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :autofocus="autofocus"
      spellcheck="false"
      autocomplete="off"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span class="e-field__error">{{ error ?? '' }}</span>
  </label>
</template>

<style scoped>
.e-field {
  display: block;
}

.e-field__label {
  display: block;
  margin-bottom: var(--e-space-2);
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
  font-weight: 600;
  letter-spacing: var(--e-tracking-wide);
  text-transform: uppercase;
}

.e-field__input {
  width: 100%;
  height: 44px;
  padding: 0 var(--e-space-4);
  background: var(--e-surface-1);
  border: 1px solid var(--e-border);
  border-radius: var(--e-radius-md);
  color: var(--e-text-primary);
  outline: none;
  transition:
    border-color var(--e-fast) var(--e-ease),
    background var(--e-fast) var(--e-ease),
    box-shadow var(--e-fast) var(--e-ease);
}

.e-field__input::placeholder {
  color: var(--e-text-muted);
}

.e-field__input:hover:not(:disabled) {
  background: var(--e-surface-2);
}

.e-field__input:focus {
  border-color: var(--e-accent);
  background: var(--e-surface-2);
  box-shadow: 0 0 0 3px var(--e-accent-soft);
}

.e-field__input:disabled {
  opacity: 0.6;
}

.e-field--invalid .e-field__input {
  border-color: var(--e-error);
}

/* Постоянная высота строки ошибки — защита от «прыгающей» вёрстки. */
.e-field__error {
  display: block;
  min-height: 16px;
  margin-top: var(--e-space-1);
  color: var(--e-error);
  font-size: var(--e-text-xs);
}
</style>
