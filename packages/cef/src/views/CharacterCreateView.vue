<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { CharacterRules, Gender, RpcEvent, type CreateCharacterRequest } from '@eclipse/shared';
import EButton from '../components/EButton.vue';
import EField from '../components/EField.vue';
import { rpc } from '../core/rpc';
import { errorText } from '../core/errors';
import { notifyError, notifySuccess } from '../core/notify';

/**
 * Создание персонажа — шаг «личность».
 *
 * Здесь только то, что нельзя изменить потом: имя, фамилия и пол. Полный
 * редактор внешности (наследственность, лицо, волосы, одежда) — отдельная
 * система, требующая игровой сцены с камерой; она запланирована в
 * ECLIPSE_ROADMAP.md, PHASE 2, и здесь сознательно не имитируется.
 */

// Имя `slot` зарезервировано во Vue за системой слотов — проп называется slotIndex.
const props = defineProps<{ slotIndex: number }>();
const emit = defineEmits<{ created: [characterId: number]; cancel: [] }>();

const busy = ref(false);
const form = reactive({ firstName: '', lastName: '', gender: Gender.Male });
const errors = reactive<Record<string, string | null>>({ firstName: null, lastName: null });

const NAME_HINT = 'С заглавной буквы, только латиница';

const checkName = (field: 'firstName' | 'lastName'): boolean => {
  const value = form[field].trim();
  if (value.length < CharacterRules.name.min || value.length > CharacterRules.name.max) {
    errors[field] = `От ${CharacterRules.name.min} до ${CharacterRules.name.max} символов`;
    return false;
  }
  if (!CharacterRules.name.pattern.test(value)) {
    errors[field] = NAME_HINT;
    return false;
  }
  errors[field] = null;
  return true;
};

const canSubmit = computed(() => !busy.value && form.firstName.length > 0 && form.lastName.length > 0);

const submit = async (): Promise<void> => {
  if (busy.value) return;
  if (![checkName('firstName'), checkName('lastName')].every(Boolean)) return;

  busy.value = true;
  try {
    const payload: CreateCharacterRequest = {
      slot: props.slotIndex,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
    };

    const result = await rpc<{ characterId: number }>(RpcEvent.CharacterCreate, payload);
    if (!result.ok) {
      notifyError(errorText(result.code, result.meta));
      return;
    }

    notifySuccess('Персонаж создан');
    emit('created', result.data.characterId);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="create">
    <div class="create__backdrop" />

    <div class="create__card e-interactive">
      <header class="create__header">
        <h2 class="create__title">Новый персонаж</h2>
        <p class="create__subtitle">Слот {{ slotIndex + 1 }} · имя изменить будет нельзя</p>
      </header>

      <form class="create__form" @submit.prevent="submit">
        <div class="create__row">
          <EField
            v-model="form.firstName"
            label="Имя"
            placeholder="John"
            :maxlength="CharacterRules.name.max"
            :error="errors['firstName']"
            :disabled="busy"
            autofocus
          />
          <EField
            v-model="form.lastName"
            label="Фамилия"
            placeholder="Doe"
            :maxlength="CharacterRules.name.max"
            :error="errors['lastName']"
            :disabled="busy"
          />
        </div>

        <div class="create__gender">
          <span class="create__gender-label">Пол</span>
          <div class="create__gender-options">
            <button
              type="button"
              class="gender"
              :class="{ 'gender--active': form.gender === Gender.Male }"
              :disabled="busy"
              @click="form.gender = Gender.Male"
            >
              Мужской
            </button>
            <button
              type="button"
              class="gender"
              :class="{ 'gender--active': form.gender === Gender.Female }"
              :disabled="busy"
              @click="form.gender = Gender.Female"
            >
              Женский
            </button>
          </div>
        </div>

        <div class="create__actions">
          <EButton variant="ghost" :disabled="busy" @click="emit('cancel')">Назад</EButton>
          <EButton type="submit" block :loading="busy" :disabled="!canSubmit">Создать</EButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.create__backdrop {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 8, 12, 0.9), rgba(7, 8, 12, 0.97));
}

.create__card {
  position: relative;
  width: 460px;
  padding: var(--e-space-6);
  background: rgba(12, 14, 20, 0.88);
  border: 1px solid var(--e-border);
  border-radius: var(--e-radius-lg);
  box-shadow: var(--e-shadow-lg);
  backdrop-filter: blur(var(--e-blur));
  animation: create-in var(--e-slow) var(--e-ease-out);
}

@keyframes create-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.create__header {
  margin-bottom: var(--e-space-5);
}

.create__title {
  margin: 0 0 var(--e-space-1);
  font-size: var(--e-text-lg);
  font-weight: 700;
}

.create__subtitle {
  margin: 0;
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
}

.create__form {
  display: flex;
  flex-direction: column;
  gap: var(--e-space-3);
}

.create__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--e-space-3);
}

.create__gender-label {
  display: block;
  margin-bottom: var(--e-space-2);
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
  font-weight: 600;
  letter-spacing: var(--e-tracking-wide);
  text-transform: uppercase;
}

.create__gender-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--e-space-2);
}

.gender {
  height: 44px;
  background: var(--e-surface-1);
  border: 1px solid var(--e-border);
  border-radius: var(--e-radius-md);
  color: var(--e-text-secondary);
  font-size: var(--e-text-sm);
  cursor: pointer;
  transition:
    background var(--e-fast) var(--e-ease),
    border-color var(--e-fast) var(--e-ease),
    color var(--e-fast) var(--e-ease);
}

.gender:hover:not(:disabled) {
  background: var(--e-surface-2);
}

.gender--active {
  background: var(--e-accent-soft);
  border-color: var(--e-accent);
  color: var(--e-text-primary);
}

.create__actions {
  display: flex;
  gap: var(--e-space-3);
  margin-top: var(--e-space-3);
}
</style>
