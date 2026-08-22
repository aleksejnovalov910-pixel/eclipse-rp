import { RpcEvent,ServerEvent,type PoliceCustodyState,type MedicalStateView } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
let restrained=false,downed=false;
export const registerOrganizationModule=():void=>{allowFromCef(
 RpcEvent.OrganizationGet,RpcEvent.OrganizationMembers,RpcEvent.OrganizationDuty,RpcEvent.OrganizationCalls,
 RpcEvent.OrganizationCreateCall,RpcEvent.OrganizationAssignCall,RpcEvent.OrganizationCloseCall,
 RpcEvent.OrganizationVehicles,RpcEvent.OrganizationVehicleSpawn,RpcEvent.OrganizationVehicleStore,RpcEvent.OrganizationStorage,RpcEvent.OrganizationStorageTransfer,RpcEvent.OrganizationUniforms,RpcEvent.OrganizationUniformEquip,
 RpcEvent.PoliceCitizen,RpcEvent.PoliceCreateRecord,RpcEvent.PoliceResolveRecord,RpcEvent.PoliceCuff,RpcEvent.PoliceUncuff,RpcEvent.PoliceSearch,RpcEvent.PoliceSeize,RpcEvent.PoliceJail,RpcEvent.PoliceRelease,
 RpcEvent.MedicalHistory,RpcEvent.MedicalTreat,RpcEvent.MedicalRevive,RpcEvent.MedicalHospitalize
);mp.events.add(ServerEvent.PoliceCustodyState,(raw:string)=>{try{const state=JSON.parse(raw) as PoliceCustodyState;restrained=state.restrained;}catch{}});mp.events.add(ServerEvent.MedicalState,(raw:string)=>{try{const state=JSON.parse(raw) as MedicalStateView;downed=state.downed;}catch{}});mp.events.add('render',()=>{if(!restrained&&!downed)return;for(const control of [21,22,23,24,25,30,31,32,33,34,35,37,44,140,141,142,143,257,263,264])mp.game.controls.disableControlAction(0,control,true);});};
