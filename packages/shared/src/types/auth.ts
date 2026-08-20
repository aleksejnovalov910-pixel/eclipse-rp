import type { AdminLevel } from '../enums';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
}

/** Профиль аккаунта, безопасный для отправки на клиент (без хэша пароля). */
export interface AccountProfile {
  id: number;
  login: string;
  adminLevel: AdminLevel;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthSuccess {
  account: AccountProfile;
}

/** Ограничения полей. Используются и на клиенте (мгновенная валидация), и на сервере (авторитетная). */
export const AuthRules = {
  login: { min: 3, max: 20, pattern: /^[a-zA-Z0-9_]+$/ },
  password: { min: 8, max: 72 },
  email: { max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ },
} as const;
