export interface PhoneProfileView { phoneNumber:string; }
export interface PhoneContactView { id:string;phoneNumber:string;displayName:string; }
export interface PhoneMessageView { id:string;direction:'in'|'out';otherPhoneNumber:string;body:string;read:boolean;createdAt:string; }
export interface PhoneContactSaveRequest { phoneNumber:string;displayName:string; }
export interface PhoneSendMessageRequest { phoneNumber:string;body:string; }
export type PhoneCallPhase='idle'|'outgoing'|'incoming'|'connected';
export interface PhoneCallStateView { phase:PhoneCallPhase;peerCharacterId:number|null;peerPhoneNumber:string|null;peerName:string|null;startedAt:string|null; }
export interface PhoneCallRequest { phoneNumber:string; }
export interface PhoneCallHistoryView { id:string;direction:'in'|'out';otherPhoneNumber:string;otherName:string;status:'missed'|'declined'|'completed'|'cancelled';startedAt:string;answeredAt:string|null;endedAt:string; }
export type PhoneClassifiedCategory='general'|'vehicle'|'property'|'service'|'job';
export interface PhoneClassifiedView { id:string;authorCharacterId:number;category:PhoneClassifiedCategory;title:string;body:string;phoneNumber:string;price:string|null;expiresAt:string;createdAt:string;ownedByMe:boolean; }
export interface PhoneClassifiedCreateRequest { category:PhoneClassifiedCategory;title:string;body:string;price?:string|null; }
