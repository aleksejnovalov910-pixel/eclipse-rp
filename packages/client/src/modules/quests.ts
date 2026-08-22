import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerQuestModule=():void=>{allowFromCef(RpcEvent.QuestList,RpcEvent.QuestClaim);};
