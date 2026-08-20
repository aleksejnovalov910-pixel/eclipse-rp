<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  CharacterRules,
  DEFAULT_APPEARANCE,
  Gender,
  RpcEvent,
  type CharacterAppearance,
  type CreateCharacterRequest,
} from '@eclipse/shared';
import EButton from '../components/EButton.vue';
import EField from '../components/EField.vue';
import { rpc } from '../core/rpc';
import { errorText } from '../core/errors';
import { notifyError, notifySuccess } from '../core/notify';

const props = defineProps<{ slotIndex: number }>();
const emit = defineEmits<{ created: [characterId: number]; cancel: [] }>();

const busy = ref(false);
const tab = ref<'identity' | 'parents' | 'face' | 'style'>('identity');
const featureIndex = ref(0);
const form = reactive({ firstName: '', lastName: '', gender: Gender.Male });
const appearance = reactive<CharacterAppearance>({
  ...DEFAULT_APPEARANCE,
  faceFeatures: [...DEFAULT_APPEARANCE.faceFeatures],
});
const errors = reactive<Record<string, string | null>>({ firstName: null, lastName: null });

const FACE_LABELS = [
  'Ширина носа','Высота носа','Длина носа','Переносица','Кончик носа','Смещение носа',
  'Высота бровей','Глубина бровей','Высота скул','Ширина скул','Ширина щёк','Глаза',
  'Губы','Ширина челюсти','Высота челюсти','Длина подбородка','Положение подбородка',
  'Ширина подбородка','Форма подбородка','Шея',
];

const checkName = (field: 'firstName' | 'lastName'): boolean => {
  const value = form[field].trim();
  if (value.length < CharacterRules.name.min || value.length > CharacterRules.name.max) {
    errors[field] = `От ${CharacterRules.name.min} до ${CharacterRules.name.max} символов`;
    return false;
  }
  if (!CharacterRules.name.pattern.test(value)) {
    errors[field] = 'С заглавной буквы, только латиница';
    return false;
  }
  errors[field] = null;
  return true;
};

const canSubmit = computed(() => !busy.value && form.firstName.length > 0 && form.lastName.length > 0);

const submit = async (): Promise<void> => {
  if (busy.value || ![checkName('firstName'), checkName('lastName')].every(Boolean)) return;
  busy.value = true;
  try {
    const payload: CreateCharacterRequest = {
      slot: props.slotIndex,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      appearance: {
        ...appearance,
        faceFeatures: [...appearance.faceFeatures],
      },
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
    <section class="editor e-interactive">
      <header class="editor__head">
        <div>
          <div class="eyebrow">Слот {{ slotIndex + 1 }}</div>
          <h2>Создание персонажа</h2>
        </div>
        <button class="close" type="button" @click="emit('cancel')">×</button>
      </header>

      <nav class="tabs">
        <button :class="{ active: tab === 'identity' }" @click="tab='identity'">Личность</button>
        <button :class="{ active: tab === 'parents' }" @click="tab='parents'">Родители</button>
        <button :class="{ active: tab === 'face' }" @click="tab='face'">Лицо</button>
        <button :class="{ active: tab === 'style' }" @click="tab='style'">Стиль</button>
      </nav>

      <div class="panel">
        <template v-if="tab === 'identity'">
          <div class="grid2">
            <EField v-model="form.firstName" label="Имя" placeholder="John" :maxlength="CharacterRules.name.max" :error="errors.firstName" />
            <EField v-model="form.lastName" label="Фамилия" placeholder="Doe" :maxlength="CharacterRules.name.max" :error="errors.lastName" />
          </div>
          <label class="caption">Пол</label>
          <div class="choice2">
            <button :class="{ active: form.gender === Gender.Male }" @click="form.gender=Gender.Male">Мужской</button>
            <button :class="{ active: form.gender === Gender.Female }" @click="form.gender=Gender.Female">Женский</button>
          </div>
        </template>

        <template v-else-if="tab === 'parents'">
          <div class="slider"><span>Мать <b>{{ appearance.mother }}</b></span><input v-model.number="appearance.mother" type="range" min="0" max="45"></div>
          <div class="slider"><span>Отец <b>{{ appearance.father }}</b></span><input v-model.number="appearance.father" type="range" min="0" max="45"></div>
          <div class="slider"><span>Сходство</span><input v-model.number="appearance.shapeMix" type="range" min="0" max="1" step="0.01"></div>
          <div class="slider"><span>Тон кожи</span><input v-model.number="appearance.skinMix" type="range" min="0" max="1" step="0.01"></div>
          <p class="hint">Значения сохраняются сервером и применяются к модели при каждом входе.</p>
        </template>

        <template v-else-if="tab === 'face'">
          <label class="caption">Параметр лица</label>
          <select v-model.number="featureIndex" class="select">
            <option v-for="(label, index) in FACE_LABELS" :key="label" :value="index">{{ label }}</option>
          </select>
          <div class="slider feature">
            <span>{{ FACE_LABELS[featureIndex] }} <b>{{ appearance.faceFeatures[featureIndex]?.toFixed(2) }}</b></span>
            <input v-model.number="appearance.faceFeatures[featureIndex]" type="range" min="-1" max="1" step="0.01">
          </div>
          <div class="slider"><span>Цвет глаз <b>{{ appearance.eyeColor }}</b></span><input v-model.number="appearance.eyeColor" type="range" min="0" max="31"></div>
        </template>

        <template v-else>
          <div class="grid2 compact">
            <div class="slider"><span>Причёска <b>{{ appearance.hairStyle }}</b></span><input v-model.number="appearance.hairStyle" type="range" min="0" max="30"></div>
            <div class="slider"><span>Цвет волос <b>{{ appearance.hairColor }}</b></span><input v-model.number="appearance.hairColor" type="range" min="0" max="63"></div>
            <div class="slider"><span>Брови <b>{{ appearance.eyebrows }}</b></span><input v-model.number="appearance.eyebrows" type="range" min="-1" max="33"></div>
            <div class="slider"><span>Цвет бровей <b>{{ appearance.eyebrowColor }}</b></span><input v-model.number="appearance.eyebrowColor" type="range" min="0" max="63"></div>
            <div class="slider"><span>Борода <b>{{ appearance.beard }}</b></span><input v-model.number="appearance.beard" type="range" min="-1" max="28"></div>
            <div class="slider"><span>Цвет бороды <b>{{ appearance.beardColor }}</b></span><input v-model.number="appearance.beardColor" type="range" min="0" max="63"></div>
          </div>
        </template>
      </div>

      <footer class="actions">
        <EButton variant="ghost" :disabled="busy" @click="emit('cancel')">Назад</EButton>
        <EButton :loading="busy" :disabled="!canSubmit" @click="submit">Создать персонажа</EButton>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.create{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding:6vh 5vw}.create__backdrop{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,12,.15),rgba(5,7,12,.35) 45%,rgba(5,7,12,.82))}.editor{position:relative;width:min(520px,42vw);max-height:88vh;padding:24px;background:rgba(12,14,20,.94);border:1px solid var(--e-border);border-radius:var(--e-radius-lg);box-shadow:var(--e-shadow-lg);overflow:auto}.editor__head{display:flex;justify-content:space-between;align-items:flex-start}.editor h2{margin:4px 0 18px;font-size:24px}.eyebrow,.caption{color:var(--e-text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.12em}.close{border:0;background:transparent;color:var(--e-text-secondary);font-size:28px;cursor:pointer}.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:20px}.tabs button,.choice2 button{height:38px;border:1px solid var(--e-border);border-radius:var(--e-radius-md);background:var(--e-surface-1);color:var(--e-text-secondary);cursor:pointer}.tabs button.active,.choice2 button.active{border-color:var(--e-accent);background:var(--e-accent-soft);color:var(--e-text-primary)}.panel{min-height:270px}.grid2,.choice2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.caption{display:block;margin:18px 0 8px}.slider{display:flex;flex-direction:column;gap:9px;margin:14px 0}.slider span{display:flex;justify-content:space-between;color:var(--e-text-secondary);font-size:13px}.slider input{width:100%;accent-color:var(--e-accent)}.compact .slider{margin:4px 0 14px}.hint{color:var(--e-text-muted);font-size:12px;line-height:1.5}.select{width:100%;height:42px;margin-top:8px;padding:0 12px;background:var(--e-surface-1);border:1px solid var(--e-border);border-radius:var(--e-radius-md);color:var(--e-text-primary)}.feature{margin-top:22px}.actions{display:flex;justify-content:flex-end;gap:12px;padding-top:20px;border-top:1px solid var(--e-border)}
</style>
