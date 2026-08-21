import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerDealershipModule=():void=>{allowFromCef(RpcEvent.DealershipOffers,RpcEvent.DealershipBuy,RpcEvent.DealershipTestDrive);};