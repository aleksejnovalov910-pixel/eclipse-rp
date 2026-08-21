import { RpcEvent } from '@eclipse/shared';import { allowFromCef } from '../core/cefBridge';
export const registerCasinoModule=():void=>{allowFromCef(RpcEvent.CasinoState,RpcEvent.CasinoExchange,RpcEvent.CasinoPlay,RpcEvent.CasinoHistory,RpcEvent.ActivityList,RpcEvent.ActivityStart,RpcEvent.ActivityStep,RpcEvent.ActivityCancel);};
