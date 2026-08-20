import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerMarketplaceModule=():void=>{allowFromCef(RpcEvent.MarketList,RpcEvent.MarketMine,RpcEvent.MarketCreate,RpcEvent.MarketCancel,RpcEvent.MarketBuy);};
