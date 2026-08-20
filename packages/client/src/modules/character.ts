import { RpcEvent, ServerEvent, type CharacterAppearance } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

const applyAppearance = (appearance: CharacterAppearance): void => {
  const player = mp.players.local;
  player.setHeadBlendData(
    appearance.mother,
    appearance.father,
    0,
    appearance.mother,
    appearance.father,
    0,
    appearance.shapeMix,
    appearance.skinMix,
    0,
    false,
  );

  for (let index = 0; index < appearance.faceFeatures.length; index += 1) {
    player.setFaceFeature(index, appearance.faceFeatures[index] ?? 0);
  }

  player.setComponentVariation(2, appearance.hairStyle, 0, 0);
  player.setHairColor(appearance.hairColor, appearance.hairHighlight);
  player.setEyeColor(appearance.eyeColor);

  const eyebrows = appearance.eyebrows < 0 ? 255 : appearance.eyebrows;
  player.setHeadOverlay(2, eyebrows, appearance.eyebrowOpacity, appearance.eyebrowColor, appearance.eyebrowColor);

  const beard = appearance.beard < 0 ? 255 : appearance.beard;
  player.setHeadOverlay(1, beard, appearance.beardOpacity, appearance.beardColor, appearance.beardColor);
};

export const registerCharacterModule = (): void => {
  allowFromCef(
    RpcEvent.CharacterList,
    RpcEvent.CharacterSelect,
    RpcEvent.CharacterCreate,
    RpcEvent.CharacterNameCheck,
  );

  mp.events.add(ServerEvent.CharacterAppearance, (payloadJson: string) => {
    try {
      const appearance = JSON.parse(payloadJson) as CharacterAppearance;
      applyAppearance(appearance);
    } catch {
      // Серверная валидация гарантирует корректный payload; повреждённое
      // сетевое сообщение просто не применяется, не ломая клиент.
    }
  });
};
