export interface AdminAccessView{role:string;level:number;permissions:string[];}
export interface AdminPlayerView{playerId:number;characterId:number;accountId:number;name:string;health:number;armour:number;dimension:number;}
export interface AdminActionRequest{targetPlayerId:number;reason?:string;minutes?:number;}
export interface AdminAuditView{id:string;actorAccountId:number|null;actorCharacterId:number|null;targetAccountId:number|null;targetCharacterId:number|null;action:string;reason:string|null;metadata:Record<string,unknown>;createdAt:string;}
