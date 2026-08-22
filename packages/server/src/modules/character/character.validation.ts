import {
  CHARACTER_SLOTS,
  CharacterRules,
  DEFAULT_APPEARANCE,
  ErrorCode,
  Gender,
  err,
  type CharacterAppearance,
  type Err,
} from '@eclipse/shared';

export const validateName = (value: unknown, field: 'firstName' | 'lastName'): Err | null => {
  if (typeof value !== 'string') return err(ErrorCode.Validation, { field });
  if (value.length < CharacterRules.name.min || value.length > CharacterRules.name.max) {
    return err(ErrorCode.Validation, { field, min: CharacterRules.name.min, max: CharacterRules.name.max });
  }
  if (!CharacterRules.name.pattern.test(value)) return err(ErrorCode.Validation, { field, reason: 'pattern' });
  return null;
};

export const validateSlot = (value: unknown): Err | null => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) >= CHARACTER_SLOTS) {
    return err(ErrorCode.Validation, { field: 'slot' });
  }
  return null;
};

export const validateGender = (value: unknown): Err | null => {
  if (value !== Gender.Male && value !== Gender.Female) return err(ErrorCode.Validation, { field: 'gender' });
  return null;
};

const integerRange = (value: unknown, min: number, max: number): boolean =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const numberRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export const normalizeAppearance = (value: unknown): CharacterAppearance | Err => {
  if (value === undefined || value === null) return { ...DEFAULT_APPEARANCE, faceFeatures: [...DEFAULT_APPEARANCE.faceFeatures] };
  if (typeof value !== 'object') return err(ErrorCode.Validation, { field: 'appearance' });
  const a = value as Partial<CharacterAppearance>;

  if (!integerRange(a.mother, 0, 45) || !integerRange(a.father, 0, 45)) return err(ErrorCode.Validation, { field: 'appearance.parents' });
  if (!numberRange(a.shapeMix, 0, 1) || !numberRange(a.skinMix, 0, 1)) return err(ErrorCode.Validation, { field: 'appearance.mix' });
  if (!Array.isArray(a.faceFeatures) || a.faceFeatures.length !== 20 || !a.faceFeatures.every((n) => numberRange(n, -1, 1))) {
    return err(ErrorCode.Validation, { field: 'appearance.faceFeatures' });
  }
  if (!integerRange(a.hairStyle, 0, 255) || !integerRange(a.hairColor, 0, 63) || !integerRange(a.hairHighlight, 0, 63)) {
    return err(ErrorCode.Validation, { field: 'appearance.hair' });
  }
  if (!integerRange(a.eyeColor, 0, 31)) return err(ErrorCode.Validation, { field: 'appearance.eyeColor' });
  if (!integerRange(a.eyebrows, -1, 33) || !integerRange(a.eyebrowColor, 0, 63) || !numberRange(a.eyebrowOpacity, 0, 1)) {
    return err(ErrorCode.Validation, { field: 'appearance.eyebrows' });
  }
  if (!integerRange(a.beard, -1, 28) || !integerRange(a.beardColor, 0, 63) || !numberRange(a.beardOpacity, 0, 1)) {
    return err(ErrorCode.Validation, { field: 'appearance.beard' });
  }

  return {
    mother: a.mother!, father: a.father!, shapeMix: a.shapeMix!, skinMix: a.skinMix!,
    faceFeatures: [...a.faceFeatures!], hairStyle: a.hairStyle!, hairColor: a.hairColor!,
    hairHighlight: a.hairHighlight!, eyeColor: a.eyeColor!, eyebrows: a.eyebrows!,
    eyebrowColor: a.eyebrowColor!, eyebrowOpacity: a.eyebrowOpacity!, beard: a.beard!,
    beardColor: a.beardColor!, beardOpacity: a.beardOpacity!,
  };
};
