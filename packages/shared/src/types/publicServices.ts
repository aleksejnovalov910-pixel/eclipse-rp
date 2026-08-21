import type { InventoryView } from './inventory';
export interface PoliceRecordView { id:string;targetCharacterId:number;officerCharacterId:number|null;kind:'fine'|'wanted'|'note';reason:string;amount:string|null;wantedLevel:number|null;active:boolean;createdAt:string;resolvedAt:string|null; }
export interface PoliceCreateRecordRequest { targetCharacterId:number;kind:'fine'|'wanted'|'note';reason:string;amount?:string;wantedLevel?:number; }
export interface PoliceCitizenView { characterId:number;name:string;activeWantedLevel:number;activeFines:string;records:PoliceRecordView[]; }
export interface PoliceCitizenRequest { targetCharacterId:number; }
export interface PoliceResolveRecordRequest { recordId:string; }
export interface PoliceTargetRequest { targetPlayerId:number; }
export interface PoliceCustodyState { characterId:number;restrained:boolean;jailedUntil:string|null;jailReason:string|null; }
export interface PoliceSearchResult { targetCharacterId:number;inventory:InventoryView; }
export interface PoliceSeizeRequest { targetPlayerId:number;itemId:string;quantity:number; }
export interface PoliceJailRequest { targetPlayerId:number;minutes:number;reason:string; }
export interface PoliceActionResult { success:true;state?:PoliceCustodyState; }
export interface MedicalRecordView { id:string;targetCharacterId:number;medicCharacterId:number|null;diagnosis:string;treatment:string;healthBefore:number;healthAfter:number;createdAt:string; }
export interface MedicalHistoryRequest { targetCharacterId:number; }
export interface MedicalTreatRequest { targetCharacterId:number;diagnosis:string;treatment:string;healTo:number; }
export interface MedicalTreatResult { health:number;record:MedicalRecordView; }
