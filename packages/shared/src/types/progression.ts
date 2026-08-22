export type ProgressionKind='achievement'|'daily'|'weekly';
export interface ProgressionTaskView{key:string;kind:ProgressionKind;title:string;description:string;progress:number;target:number;completed:boolean;claimed:boolean;rewardCash:string;rewardPoints:number;resetAt:string|null;}
export interface BattlePassTierView{tier:number;requiredPoints:number;unlocked:boolean;claimed:boolean;rewardCash:string;}
export interface ProgressionOverviewView{points:number;seasonKey:string;tasks:ProgressionTaskView[];battlePass:BattlePassTierView[];}
export interface ProgressionClaimRequest{key:string;}
export interface BattlePassClaimRequest{tier:number;}
