import type { Gender } from '../enums';

export interface CharacterAppearance {
  mother: number;
  father: number;
  shapeMix: number;
  skinMix: number;
  faceFeatures: number[];
  hairStyle: number;
  hairColor: number;
  hairHighlight: number;
  eyeColor: number;
  eyebrows: number;
  eyebrowColor: number;
  eyebrowOpacity: number;
  beard: number;
  beardColor: number;
  beardOpacity: number;
}

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  mother: 21,
  father: 0,
  shapeMix: 0.5,
  skinMix: 0.5,
  faceFeatures: Array.from({ length: 20 }, () => 0),
  hairStyle: 0,
  hairColor: 0,
  hairHighlight: 0,
  eyeColor: 0,
  eyebrows: -1,
  eyebrowColor: 0,
  eyebrowOpacity: 1,
  beard: -1,
  beardColor: 0,
  beardOpacity: 1,
};

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
  appearance: CharacterAppearance;
}

export interface CreateCharacterRequest {
  slot: number;
  firstName: string;
  lastName: string;
  gender: Gender;
  appearance?: CharacterAppearance;
}

export const CharacterRules = {
  name: { min: 2, max: 16, pattern: /^[A-Z][a-z]+$/ },
} as const;

export const fullName = (c: Pick<CharacterSummary, 'firstName' | 'lastName'>): string =>
  `${c.firstName} ${c.lastName}`;
