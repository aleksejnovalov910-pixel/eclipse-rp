import { RpcEvent,ServerEvent,type MedicalStateView,type PoliceCustodyState } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
let restrained=false,downed=false;
export const registerOrganizationModule=():void=>{allowFromCef(
 RpcEvent.OrganizationGet,RpcEvent.OrganizationMembers,RpcEvent.OrganizationDuty,RpcEvent.OrganizationCalls,
 RpcEvent.OrganizationCreateCall,RpcEvent.OrganizationAssignCall,RpcEvent.OrganizationCloseCall,
 RpcEvent.PoliceCitizen,RpcEvent.PoliceCreateRecord,RpcEvent.PoliceResolveRecord,RpcEvent.PoliceCuff,RpcEvent.PoliceUncuff,RpcEvent.PoliceSearch,RpcEvent.PoliceSeize,RpcEvent.PoliceJail,RpcEvent.PoliceRelease,
 RpcEvent.MedicalHistory,RpcEvent.MedicalTreat,RpcEvent.MedicalRevive,RpcEvent.MedicalHospitalize
);mp.events.add(ServerEvent.PoliceCustodyState,(raw:string)=>{try{const state=JSON.parse(raw) as PoliceCustodyState;restrained=state.restrained;}catch{}});mp.events.add(ServerEvent.MedicalState,(raw:string)=>{try{const state=JSON.parse(raw) as MedicalStateView;downed=state.downed;if(downed)mp.players.local.setToRagdoll(1000,1000,0,false,false,false);}catch{}});mp.events.add('render',()=>{if(!restrained&&!downed)return;const controls=downed?[21,22,23,24,25,30,31,32,33,34,35,37,44,75,140,141,142,143,257,263,264]:[24,25,37,44,140,141,142,143,257,263,264];for(const control of controls)mp.game.controls.disableControlAction(0,control,true);if(downed)mp.players.local.setToRagdoll(500,500,0,false,false,false);});};
