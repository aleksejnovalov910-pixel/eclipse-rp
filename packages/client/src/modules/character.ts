import { RpcEvent, ServerEvent, type CharacterAppearance, type OutfitComponents } from '@eclipse/shared';
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

const applyOutfit = (components: OutfitComponents): void => {
  const player = mp.players.local;
  for (const [componentId, state] of Object.entries(components)) {
    const id = Number(componentId);
    if (!Number.isInteger(id) || id < 0 || id > 11) continue;
    if (!state || !Number.isInteger(state.drawable) || !Number.isInteger(state.texture)) continue;
    player.setComponentVariation(id, state.drawable, state.texture, 0);
  }
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
      // Corrupted network payload is ignored instead of breaking the client.
    }
  });

  mp.events.add(ServerEvent.OutfitState, (payloadJson: string) => {
    try {
      applyOutfit(JSON.parse(payloadJson) as OutfitComponents);
    } catch {
      // Outfit state is server-owned; malformed payload is ignored safely.
    }
  });
};