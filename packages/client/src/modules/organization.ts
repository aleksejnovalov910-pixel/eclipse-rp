import { RpcEvent,ServerEvent,type PoliceCustodyState } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
let restrained=false;
export const registerOrganizationModule=():void=>{allowFromCef(
 RpcEvent.OrganizationGet,RpcEvent.OrganizationMembers,RpcEvent.OrganizationDuty,RpcEvent.OrganizationCalls,
 RpcEvent.OrganizationCreateCall,RpcEvent.OrganizationAssignCall,RpcEvent.OrganizationCloseCall,
 RpcEvent.PoliceCitizen,RpcEvent.PoliceCreateRecord,RpcEvent.PoliceResolveRecord,RpcEvent.PoliceCuff,RpcEvent.PoliceUncuff,RpcEvent.PoliceSearch,RpcEvent.PoliceSeize,RpcEvent.PoliceJail,RpcEvent.PoliceRelease,
 RpcEvent.MedicalHistory,RpcEvent.MedicalTreat
);mp.events.add(ServerEvent.PoliceCustodyState,(raw:string)=>{try{const state=JSON.parse(raw) as PoliceCustodyState;restrained=state.restrained;}catch{}});mp.events.add('render',()=>{if(!restrained)return;for(const control of [24,25,37,44,140,141,142,143,257,263,264])mp.game.controls.disableControlAction(0,control,true);});};
