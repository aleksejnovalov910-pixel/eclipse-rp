import {
  RpcEvent,
  ServerEvent,
  SessionState,
  type CharacterSummary,
  type CreateCharacterRequest,
  type Result,
} from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import { createLogger } from '../../core/logger';
import { PLAYER_MODELS } from '../../config/world';
import * as service from './character.service';
import { beginTracking } from './character.state';
import { advanceQuestSafe } from '../quests/quest.service';
import { currentOutfit,currentTattoos } from '../customization/customization.service';
import { custodyState } from '../publicServices/policeActions.service';

const log = createLogger('character:rpc');

export const registerCharacterModule = (): void => {
  const listRule = { max: 20, windowMs: 60_000 };
  const createRule = { max: 5, windowMs: 10 * 60 * 1000 };
  const selectRule = { max: 10, windowMs: 60_000 };
  const nameCheckRule = { max: 30, windowMs: 60_000 };

  onRpc<unknown, CharacterSummary[]>(RpcEvent.CharacterList, async (ctx): Promise<Result<CharacterSummary[]>> => {
    const limited = consume(ctx.session, 'character:list', listRule);
    if (limited) return limited;
    return service.list(ctx.session);
  });

  onRpc<{ firstName: string; lastName: string }, { available: boolean }>(
    RpcEvent.CharacterNameCheck,
    async (ctx, payload) => {
      const limited = consume(ctx.session, 'character:nameCheck', nameCheckRule);
      if (limited) return limited;
      return service.isNameAvailable(ctx.session, payload);
    },
  );

  onRpc<CreateCharacterRequest, { characterId: number }>(RpcEvent.CharacterCreate, async (ctx, payload) => {
    const limited = consume(ctx.session, 'character:create', createRule);
    if (limited) return limited;
    return service.create(ctx.session, payload);
  });

  onRpc<{ characterId: number }, { characterId: number }>(RpcEvent.CharacterSelect, async (ctx, payload) => {
    const limited = consume(ctx.session, 'character:select', selectRule);
    if (limited) return limited;

    const result = await service.select(ctx.session, payload?.characterId);
    if (!result.ok) return result;

    spawn(ctx.player, result.data);
    beginTracking(ctx.session);
    ctx.player.call(ServerEvent.CharacterAppearance, [JSON.stringify(result.data.appearance)]);
    const [outfit,tattoos,custody]=await Promise.all([currentOutfit(result.data.characterId),currentTattoos(result.data.characterId),custodyState(result.data.characterId)]);
    ctx.player.call(ServerEvent.OutfitState, [JSON.stringify(outfit.components)]);
    ctx.player.call(ServerEvent.TattooState, [JSON.stringify(tattoos)]);
    if(custody.jailedUntil&&new Date(custody.jailedUntil).getTime()>Date.now()){
      ctx.player.position=new mp.Vector3(1690.8,2591.3,45.9);
      ctx.player.dimension=0;
    }
    ctx.player.call(ServerEvent.PoliceCustodyState,[JSON.stringify(custody)]);
    ctx.player.call(ServerEvent.SessionState, [SessionState.Playing]);
    await advanceQuestSafe(result.data.characterId, 'welcome');
    return { ok: true, data: { characterId: result.data.characterId } };
  });
};

const spawn = (player: PlayerMp, data: service.SpawnData): void => {
  if (!mp.players.exists(player)) return;
  try {
    player.name = data.name;
    player.model = mp.joaat(PLAYER_MODELS[data.gender]);
    player.spawn(new mp.Vector3(data.position.x, data.position.y, data.position.z));
    player.heading = data.heading;
    player.dimension = data.dimension;
    player.health = data.health;
    player.armour = data.armour;
  } catch (error) {
    log.error(`не удалось разместить персонажа id=${data.characterId} в мире`, error);
  }
};