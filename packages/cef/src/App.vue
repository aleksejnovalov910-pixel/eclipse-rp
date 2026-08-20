<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { CefEvent, NotifyType } from '@eclipse/shared';
import AuthView from './views/AuthView.vue';
import CharacterSelectView from './views/CharacterSelectView.vue';
import CharacterCreateView from './views/CharacterCreateView.vue';
import EToastHost from './components/EToastHost.vue';
import { onClient, toClient, isInGame } from './core/bridge';
import { notify } from './core/notify';

/**
 * Корень интерфейса ECLIPSE.
 *
 * Ровно один CEF-браузер на весь клиент, а экраны — это состояния Vue.
 * Каждый дополнительный браузер стоит памяти и кадров, и именно множащиеся
 * браузеры чаще всего превращают RP-сборку в слайд-шоу.
 *
 * Источник правды об активном экране — клиент. CEF сам себя не переключает,
 * кроме локальных переходов внутри одного этапа (выбор -> создание), потому
 * что там нет серверного состояния, которое могло бы разойтись.
 */

type Screen = 'blank' | 'auth' | 'characterSelect' | 'characterCreate';

const screen = ref<Screen>('blank');
const createSlot = ref(0);
const selectRef = shallowRef<InstanceType<typeof CharacterSelectView> | null>(null);

onClient(CefEvent.Screen, (payload) => {
  const { name } = (payload ?? {}) as { name?: string };
  if (name === 'auth' || name === 'characterSelect' || name === 'characterCreate' || name === 'blank') {
    screen.value = name;
  }
});

onClient(CefEvent.Notify, (payload) => {
  const { type, text } = (payload ?? {}) as { type?: NotifyType; text?: string };
  if (!text) return;
  notify(type ?? NotifyType.Info, text);
});

const onAuthenticated = (): void => {
  screen.value = 'characterSelect';
};

const onCreateRequested = (slot: number): void => {
  createSlot.value = slot;
  screen.value = 'characterCreate';
};

const onCreated = (): void => {
  screen.value = 'characterSelect';
  // Список персонажей изменился — перечитываем, а не дорисовываем локально:
  // авторитетные данные всегда приходят с сервера.
  void selectRef.value?.reload();
};

onMounted(() => {
  // Клиент буферизует сообщения до этого момента, поэтому порядок важен:
  // подписки выше уже установлены, ни одно событие не потеряется.
  toClient(CefEvent.Ready);

  // Вне игры показываем экран входа, чтобы `npm run dev:cef` был полезен.
  if (!isInGame()) screen.value = 'auth';
});
</script>

<template>
  <Transition name="screen" mode="out-in">
    <AuthView v-if="screen === 'auth'" key="auth" @authenticated="onAuthenticated" />
    <CharacterSelectView
      v-else-if="screen === 'characterSelect'"
      key="select"
      ref="selectRef"
      @create="onCreateRequested"
    />
    <CharacterCreateView
      v-else-if="screen === 'characterCreate'"
      key="create"
      :slot-index="createSlot"
      @created="onCreated"
      @cancel="screen = 'characterSelect'"
    />
  </Transition>

  <EToastHost />
</template>

<style scoped>
.screen-enter-active,
.screen-leave-active {
  transition: opacity var(--e-normal) var(--e-ease);
}
.screen-enter-from,
.screen-leave-to {
  opacity: 0;
}
</style>
