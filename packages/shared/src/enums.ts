/** Уровни доступа. Числовые — чтобы можно было сравнивать `>=`. */
export enum AdminLevel {
  Player = 0,
  Support = 1,
  Moderator = 2,
  Admin = 3,
  HeadAdmin = 4,
  Developer = 5,
}

export enum Gender {
  Male = 'male',
  Female = 'female',
}

/**
 * Состояние игровой сессии. Единственный источник правды о том,
 * на каком шаге onboarding-флоу находится игрок.
 *
 * Connecting -> Authenticating -> CharacterSelect -> CharacterCreate -> Spawning -> Playing
 */
export enum SessionState {
  Connecting = 'connecting',
  Authenticating = 'authenticating',
  CharacterSelect = 'character_select',
  CharacterCreate = 'character_create',
  Spawning = 'spawning',
  Playing = 'playing',
}

/** Типы всплывающих уведомлений в CEF. */
export enum NotifyType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export const CHARACTER_SLOTS = 3;
