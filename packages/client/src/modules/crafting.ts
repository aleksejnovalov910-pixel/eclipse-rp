import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerCraftingModule=():void=>allowFromCef(RpcEvent.CraftingStations,RpcEvent.CraftingRecipes,RpcEvent.CraftingOrders,RpcEvent.CraftingStart,RpcEvent.CraftingCollect);
