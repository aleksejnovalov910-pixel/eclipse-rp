import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerBusinessModule=():void=>{allowFromCef(RpcEvent.BusinessCatalog,RpcEvent.BusinessOwned,RpcEvent.BusinessBuy,RpcEvent.BusinessSell,RpcEvent.BusinessDeposit,RpcEvent.BusinessWithdraw,RpcEvent.BusinessRestock,RpcEvent.BusinessSetMarkup);};
