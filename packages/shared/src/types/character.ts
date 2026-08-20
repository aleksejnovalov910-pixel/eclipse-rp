import type { Gender } from '../enums';

/** Краткая карточка персонажа для экрана выбора. */
export interface CharacterSummary {
  id: number;
  slot: number;
  firstName: string;
  lastName: string;
  gender: Gender;
  level: number;
  playedMinutes: number;
  cash: number;
  bank: number;
  organization: string | null;
  lastPlayedAt: string | null;
}

export interface CreateCharacterRequest {
  slot: number;
  firstName: string;
  lastName: string;
  gender: Gender;
}

export const CharacterRules = {
  name: { min: 2, max: 16, pattern: /^[A-Z][a-z]+$/ },
} as const;

/** Единая точка форматирования полного имени — чтобы не расползалось по коду. */
export const fullName = (c: Pick<CharacterSummary, 'firstName' | 'lastName'>): string =>
  `${c.firstName} ${c.lastName}`;
