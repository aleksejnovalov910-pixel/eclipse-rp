import type { InventoryView } from './inventory';
export interface OrganizationView { id:string;key:string;name:string;kind:string;rankName:string;rankIndex:number;onDuty:boolean;permissions:Record<string,unknown>; }
export interface OrganizationMemberView { characterId:number;name:string;rankName:string;rankIndex:number;onDuty:boolean;joinedAt:string; }
export interface OrganizationCallView { id:string;kind:string;callerCharacterId:number|null;assignedCharacterId:number|null;status:string;message:string;position:{x:number;y:number;z:number};createdAt:string; }
export interface OrganizationDutyResult { onDuty:boolean; }
export interface OrganizationCreateCallRequest { kind:'police'|'ems';message:string; }
export interface OrganizationAssignCallRequest { callId:string; }
export interface OrganizationCloseCallRequest { callId:string; }
export interface OrganizationVehicleView { id:string;model:string;name:string;plate:string;minRank:number;spawned:boolean; }
export interface OrganizationVehicleRequest { vehicleId:string; }
export interface OrganizationUniformView { id:string;key:string;name:string;gender:string;minRank:number;components:Record<string,{drawable:number;texture:number}>; }
export interface OrganizationUniformRequest { uniformId:string; }
export interface OrganizationStorageView extends InventoryView {}
export interface OrganizationStorageTransferRequest { itemId:string;quantity:number;direction:'deposit'|'withdraw'; }
