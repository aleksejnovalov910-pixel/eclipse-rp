<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CHARACTER_SLOTS, RpcEvent, fullName, type CharacterSummary } from '@eclipse/shared';
import EBrand from '../components/EBrand.vue';
import EButton from '../components/EButton.vue';
import { rpc } from '../core/rpc';
import { errorText } from '../core/errors';
import { notifyError } from '../core/notify';

/**
 * Экран выбора персонажа.
 *
 * Выбор и создание намеренно разделены: смешанный интерфейс заставляет
 * игрока разбираться, что перед ним — карточка или форма. Здесь только
 * выбор; пустой слот ведёт на отдельный экран создания.
 *
 * Пока персонаж не отображается в мире физически (это требует сцены
 * презентации — см. ECLIPSE_ROADMAP.md, PHASE 2). Карточка показывает
 * реальные данные из базы, а не заглушки.
 */

const emit = defineEmits<{ create: [slot: number]; spawn: [characterId: number] }>();

const loading = ref(true);
const busySlot = ref<number | null>(null);
const characters = ref<CharacterSummary[]>([]);

const bySlot = computed(() => {
  const map = new Map<number, CharacterSummary>();
  for (const character of characters.value) map.set(character.slot, character);
  return map;
});

const slots = computed(() => Array.from({ length: CHARACTER_SLOTS }, (_, index) => index));

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const result = await rpc<CharacterSummary[]>(RpcEvent.CharacterList);
    if (!result.ok) {
      notifyError(errorText(result.code, result.meta));
      characters.value = [];
      return;
    }
    characters.value = result.data;
  } finally {
    loading.value = false;
  }
};

const select = async (character: CharacterSummary): Promise<void> => {
  if (busySlot.value !== null) return;
  busySlot.value = character.slot;
  try {
    const result = await rpc<{ characterId: number }>(RpcEvent.CharacterSelect, { characterId: character.id });
    if (!result.ok) {
      notifyError(errorText(result.code, result.meta));
      return;
    }
    emit('spawn', result.data.characterId);
  } finally {
    busySlot.value = null;
  }
};

/** Время в игре читается как «12 ч 30 мин», а не как 750. */
const playedText = (minutes: number): string => {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
};

/** Деньги — с разделителями разрядов и без дробной части там, где она нулевая. */
const moneyText = (value: number): string => `$${value.toLocaleString('ru-RU')}`;

onMounted(load);

defineExpose({ reload: load });
</script>

<template>
  <div class="select">
    <div class="select__backdrop" />

    <div class="select__content e-interactive">
      <header class="select__header">
        <EBrand :size="44" />
        <p class="select__subtitle">Выберите персонажа</p>
      </header>

      <div class="select__slots">
        <template v-if="loading">
          <div v-for="slot in slots" :key="`skeleton-${slot}`" class="card card--skeleton" />
        </template>

        <template v-else>
          <div v-for="slot in slots" :key="slot" class="card" :class="{ 'card--empty': !bySlot.get(slot) }">
            <template v-if="bySlot.get(slot)">
              <div class="card__body">
                <h3 class="card__name">{{ fullName(bySlot.get(slot)!) }}</h3>
                <div class="card__level">
                  <span class="card__level-badge">{{ bySlot.get(slot)!.level }}</span>
                  уровень
                </div>

                <dl class="card__stats">
                  <div class="card__stat">
                    <dt>Наличные</dt>
                    <dd>{{ moneyText(bySlot.get(slot)!.cash) }}</dd>
                  </div>
                  <div class="card__stat">
                    <dt>Банк</dt>
                    <dd>{{ moneyText(bySlot.get(slot)!.bank) }}</dd>
                  </div>
                  <div class="card__stat">
                    <dt>В игре</dt>
                    <dd>{{ playedText(bySlot.get(slot)!.playedMinutes) }}</dd>
                  </div>
                  <div class="card__stat">
                    <dt>Организация</dt>
                    <dd>{{ bySlot.get(slot)!.organization ?? 'Нет' }}</dd>
                  </div>
                </dl>
              </div>

              <EButton
                block
                :loading="busySlot === slot"
                :disabled="busySlot !== null && busySlot !== slot"
                @click="select(bySlot.get(slot)!)"
              >
                Играть
              </EButton>
            </template>

            <template v-else>
              <!-- Пустое состояние: слот объясняет, что с ним делать, а не молчит серым прямоугольником. -->
              <div class="card__empty">
                <div class="card__plus">+</div>
                <p class="card__empty-text">Свободный слот</p>
              </div>
              <EButton variant="ghost" block :disabled="busySlot !== null" @click="emit('create', slot)">
                Создать персонажа
              </EButton>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.select__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(100% 70% at 50% 0%, rgba(255, 138, 61, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(7, 8, 12, 0.9), rgba(7, 8, 12, 0.97));
}

.select__content {
  position: relative;
  width: min(1040px, 92vw);
}

.select__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--e-space-5);
}

.select__subtitle {
  margin: 0;
  color: var(--e-text-muted);
  font-size: var(--e-text-sm);
  letter-spacing: var(--e-tracking-wide);
  text-transform: uppercase;
}

.select__slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--e-space-4);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--e-space-4);
  min-height: 300px;
  padding: var(--e-space-5);
  background: rgba(12, 14, 20, 0.82);
  border: 1px solid var(--e-border);
  border-radius: var(--e-radius-lg);
  box-shadow: var(--e-shadow-md);
  backdrop-filter: blur(var(--e-blur));
  transition: border-color var(--e-fast) var(--e-ease);
}

.card:hover {
  border-color: var(--e-border-strong);
}

.card--empty {
  border-style: dashed;
}

.card--skeleton {
  background: linear-gradient(
    100deg,
    var(--e-surface-1) 30%,
    var(--e-surface-2) 50%,
    var(--e-surface-1) 70%
  );
  background-size: 220% 100%;
  animation: card-shimmer 1.3s var(--e-ease) infinite;
}

@keyframes card-shimmer {
  to {
    background-position: -220% 0;
  }
}

.card__body {
  flex: 1;
}

.card__name {
  margin: 0 0 var(--e-space-2);
  font-size: var(--e-text-lg);
  font-weight: 700;
  /* Длинные имена не должны ломать карточку. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__level {
  display: flex;
  align-items: center;
  gap: var(--e-space-2);
  margin-bottom: var(--e-space-5);
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--e-tracking-wide);
}

.card__level-badge {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 22px;
  padding: 0 var(--e-space-2);
  background: var(--e-accent-soft);
  border-radius: var(--e-radius-sm);
  color: var(--e-accent);
  font-size: var(--e-text-sm);
  font-weight: 700;
}

.card__stats {
  display: flex;
  flex-direction: column;
  gap: var(--e-space-2);
  margin: 0;
}

.card__stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--e-space-3);
}

.card__stat dt {
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
}

.card__stat dd {
  margin: 0;
  color: var(--e-text-secondary);
  font-size: var(--e-text-sm);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--e-space-3);
}

.card__plus {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--e-border);
  border-radius: 50%;
  color: var(--e-text-muted);
  font-size: var(--e-text-xl);
  font-weight: 300;
}

.card__empty-text {
  margin: 0;
  color: var(--e-text-muted);
  font-size: var(--e-text-sm);
}
</style>
