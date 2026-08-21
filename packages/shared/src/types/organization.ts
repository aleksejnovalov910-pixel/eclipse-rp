export interface OrganizationView { id:string;key:string;name:string;kind:string;rankName:string;rankIndex:number;onDuty:boolean;permissions:Record<string,unknown>; }
export interface OrganizationMemberView { characterId:number;name:string;rankName:string;rankIndex:number;onDuty:boolean;joinedAt:string; }
export interface OrganizationCallView { id:string;kind:string;callerCharacterId:number|null;assignedCharacterId:number|null;status:string;message:string;position:{x:number;y:number;z:number};createdAt:string; }
export interface OrganizationDutyResult { onDuty:boolean; }
export interface OrganizationCreateCallRequest { kind:'police'|'ems';message:string; }
export interface OrganizationAssignCallRequest { callId:string; }
export interface OrganizationCloseCallRequest { callId:string; }
