import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerStoreModule=():void=>{allowFromCef(RpcEvent.StoreProducts,RpcEvent.StoreBuy);};