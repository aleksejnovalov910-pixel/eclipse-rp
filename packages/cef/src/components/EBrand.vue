<script setup lang="ts">
/**
 * Знак ECLIPSE: тёмный диск и тёплая корона вокруг него.
 *
 * Рисуется SVG, а не картинкой: масштабируется без потерь, весит десятки
 * байт и наследует цвета дизайн-системы. Никаких внешних ассетов на экране
 * загрузки — их отсутствие не должно превращаться в пустое место.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 56 });
</script>

<template>
  <div class="e-brand">
    <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="e-corona" cx="50%" cy="50%" r="50%">
          <stop offset="62%" stop-color="var(--e-accent)" stop-opacity="0" />
          <stop offset="78%" stop-color="var(--e-accent)" stop-opacity="0.85" />
          <stop offset="100%" stop-color="var(--e-accent)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#e-corona)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="var(--e-accent)" stroke-width="2" />
      <circle cx="42" cy="46" r="27" fill="var(--e-bg-void)" />
    </svg>
    <div class="e-brand__text">
      <span class="e-brand__name">ECLIPSE</span>
      <span class="e-brand__suffix">RP</span>
    </div>
  </div>
</template>

<style scoped>
.e-brand {
  display: flex;
  align-items: center;
  gap: var(--e-space-3);
}

.e-brand__text {
  display: flex;
  align-items: baseline;
  gap: var(--e-space-2);
}

.e-brand__name {
  font-size: var(--e-text-xl);
  font-weight: 700;
  letter-spacing: var(--e-tracking-wide);
}

.e-brand__suffix {
  color: var(--e-accent);
  font-size: var(--e-text-sm);
  font-weight: 700;
  letter-spacing: var(--e-tracking-wide);
}
</style>
