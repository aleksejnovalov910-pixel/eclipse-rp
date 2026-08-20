<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { AuthRules, RpcEvent, type AuthSuccess, type LoginRequest, type RegisterRequest } from '@eclipse/shared';
import EBrand from '../components/EBrand.vue';
import EButton from '../components/EButton.vue';
import EField from '../components/EField.vue';
import { rpc } from '../core/rpc';
import { errorText } from '../core/errors';
import { notifyError } from '../core/notify';

/**
 * Экран авторизации.
 *
 * Компактное окно и ровно два состояния — вход и регистрация. Никаких
 * обязательных внешних сервисов: игрок, который дошёл до сервера, должен
 * попасть в игру, а не в цепочку привязок аккаунтов.
 *
 * Валидация здесь — только ради мгновенной подсказки. Авторитетная проверка
 * живёт на сервере и использует те же правила из @eclipse/shared, поэтому
 * разойтись они физически не могут.
 */

const emit = defineEmits<{ authenticated: [account: AuthSuccess['account']] }>();

type Mode = 'login' | 'register';

const mode = ref<Mode>('login');
const busy = ref(false);

const form = reactive({ login: '', email: '', password: '', passwordRepeat: '' });
const errors = reactive<Record<string, string | null>>({
  login: null,
  email: null,
  password: null,
  passwordRepeat: null,
});

const clearErrors = (): void => {
  for (const key of Object.keys(errors)) errors[key] = null;
};

watch(mode, () => {
  clearErrors();
  form.password = '';
  form.passwordRepeat = '';
});

const checkLogin = (): boolean => {
  const value = form.login.trim();
  if (value.length < AuthRules.login.min || value.length > AuthRules.login.max) {
    errors['login'] = `От ${AuthRules.login.min} до ${AuthRules.login.max} символов`;
    return false;
  }
  if (!AuthRules.login.pattern.test(value)) {
    errors['login'] = 'Только латиница, цифры и «_»';
    return false;
  }
  errors['login'] = null;
  return true;
};

const checkPassword = (): boolean => {
  if (form.password.length < AuthRules.password.min) {
    errors['password'] = `Минимум ${AuthRules.password.min} символов`;
    return false;
  }
  errors['password'] = null;
  return true;
};

const checkEmail = (): boolean => {
  if (!AuthRules.email.pattern.test(form.email.trim())) {
    errors['email'] = 'Введите корректный адрес';
    return false;
  }
  errors['email'] = null;
  return true;
};

const checkRepeat = (): boolean => {
  if (form.password !== form.passwordRepeat) {
    errors['passwordRepeat'] = 'Пароли не совпадают';
    return false;
  }
  errors['passwordRepeat'] = null;
  return true;
};

/** Кнопка активна только когда форма в принципе заполнена — без мигания ошибок при вводе. */
const canSubmit = computed(() => {
  if (busy.value) return false;
  if (mode.value === 'login') return form.login.length > 0 && form.password.length > 0;
  return (
    form.login.length > 0 && form.email.length > 0 && form.password.length > 0 && form.passwordRepeat.length > 0
  );
});

const submit = async (): Promise<void> => {
  if (busy.value) return;

  const valid =
    mode.value === 'login'
      ? [checkLogin(), checkPassword()].every(Boolean)
      : [checkLogin(), checkEmail(), checkPassword(), checkRepeat()].every(Boolean);

  if (!valid) return;

  busy.value = true;
  try {
    const payload: LoginRequest | RegisterRequest =
      mode.value === 'login'
        ? { login: form.login.trim(), password: form.password }
        : { login: form.login.trim(), email: form.email.trim(), password: form.password };

    const event = mode.value === 'login' ? RpcEvent.AuthLogin : RpcEvent.AuthRegister;
    const result = await rpc<AuthSuccess>(event, payload);

    if (!result.ok) {
      notifyError(errorText(result.code, result.meta));
      return;
    }

    // Пароль не должен пережить успешный вход даже в памяти страницы.
    form.password = '';
    form.passwordRepeat = '';
    emit('authenticated', result.data.account);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="auth">
    <div class="auth__backdrop" />

    <div class="auth__card e-interactive">
      <EBrand class="auth__brand" />

      <div class="auth__tabs" role="tablist">
        <button
          class="auth__tab"
          :class="{ 'auth__tab--active': mode === 'login' }"
          :disabled="busy"
          @click="mode = 'login'"
        >
          Вход
        </button>
        <button
          class="auth__tab"
          :class="{ 'auth__tab--active': mode === 'register' }"
          :disabled="busy"
          @click="mode = 'register'"
        >
          Регистрация
        </button>
      </div>

      <form class="auth__form" @submit.prevent="submit">
        <EField
          v-model="form.login"
          label="Логин"
          placeholder="Ваш логин"
          :maxlength="AuthRules.login.max"
          :error="errors['login']"
          :disabled="busy"
          autofocus
        />

        <EField
          v-if="mode === 'register'"
          v-model="form.email"
          label="Почта"
          placeholder="you@example.com"
          :maxlength="AuthRules.email.max"
          :error="errors['email']"
          :disabled="busy"
        />

        <EField
          v-model="form.password"
          label="Пароль"
          type="password"
          placeholder="••••••••"
          :maxlength="AuthRules.password.max"
          :error="errors['password']"
          :disabled="busy"
        />

        <EField
          v-if="mode === 'register'"
          v-model="form.passwordRepeat"
          label="Пароль ещё раз"
          type="password"
          placeholder="••••••••"
          :maxlength="AuthRules.password.max"
          :error="errors['passwordRepeat']"
          :disabled="busy"
        />

        <EButton type="submit" block :loading="busy" :disabled="!canSubmit">
          {{ mode === 'login' ? 'Войти' : 'Создать аккаунт' }}
        </EButton>
      </form>

      <p class="auth__hint">
        {{
          mode === 'login'
            ? 'Нет аккаунта? Он создаётся за полминуты.'
            : 'Пароль хранится только в виде хэша — восстановить его нельзя, поэтому запомните.'
        }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

/* Затемнение делает экран, а не body: остальные интерфейсы должны
   оставаться прозрачными поверх игры. */
.auth__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 8%, rgba(255, 138, 61, 0.1), transparent 55%),
    linear-gradient(180deg, rgba(7, 8, 12, 0.86), rgba(7, 8, 12, 0.97));
}

.auth__card {
  position: relative;
  width: 380px;
  padding: var(--e-space-6);
  background: rgba(12, 14, 20, 0.86);
  border: 1px solid var(--e-border);
  border-radius: var(--e-radius-lg);
  box-shadow: var(--e-shadow-lg);
  backdrop-filter: blur(var(--e-blur));
  animation: auth-in var(--e-slow) var(--e-ease-out);
}

@keyframes auth-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.auth__brand {
  margin-bottom: var(--e-space-5);
}

.auth__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--e-space-1);
  margin-bottom: var(--e-space-5);
  padding: var(--e-space-1);
  background: var(--e-surface-1);
  border-radius: var(--e-radius-md);
}

.auth__tab {
  padding: var(--e-space-2) 0;
  background: transparent;
  border: none;
  border-radius: var(--e-radius-sm);
  color: var(--e-text-muted);
  font-size: var(--e-text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--e-fast) var(--e-ease),
    color var(--e-fast) var(--e-ease);
}

.auth__tab:hover:not(:disabled) {
  color: var(--e-text-secondary);
}

.auth__tab--active {
  background: var(--e-surface-3);
  color: var(--e-text-primary);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--e-space-2);
}

.auth__form > :last-child {
  margin-top: var(--e-space-3);
}

.auth__hint {
  margin: var(--e-space-4) 0 0;
  color: var(--e-text-muted);
  font-size: var(--e-text-xs);
  text-align: center;
}
</style>
