export interface CriminalFactionView{id:string;key:string;name:string;color:number;balance:string;reputation:number;rankName:string;rankIndex:number;permissions:Record<string,unknown>}
export interface CriminalTerritoryView{id:string;key:string;name:string;ownerFactionId:string|null;ownerName:string|null;center:{x:number;y:number};radius:number;income:string}
export interface CriminalContractView{id:string;contractKey:string;title:string;progress:number;target:number;rewardMoney:string;rewardReputation:number;expiresAt:string;completed:boolean}
export interface CriminalInviteRequest{targetCharacterId:number}
export interface CriminalSetRankRequest{targetCharacterId:number;rankIndex:number}
export interface CriminalContractProgressRequest{contractId:string;amount?:number}
