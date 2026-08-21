import type { InventoryView } from './inventory';
export interface FamilyView {
  id: string;
  name: string;
  balance: string;
  reputation: number;
  level: number;
  rankName: string;
  memberCount: number;
}
export interface FamilyCreateRequest { name: string; }
export interface FamilyMemberView { characterId:number;name:string;rankName:string;rankIndex:number;contribution:number;joinedAt:string; }
export interface FamilyInvitationView { familyId:string;familyName:string;inviterCharacterId:number;expiresAt:string; }
export interface FamilyInviteRequest { targetCharacterId:number; }
export interface FamilyTreasuryRequest { amount:string; }
export interface FamilyRankView { id:string;rankIndex:number;name:string;permissions:Record<string,unknown>; }
export interface FamilySetRankRequest { targetCharacterId:number;rankIndex:number; }
export interface FamilyKickRequest { targetCharacterId:number; }
export interface FamilyAuditView { id:string;actorCharacterId:number|null;targetCharacterId:number|null;action:string;metadata:Record<string,unknown>;createdAt:string; }
export interface FamilyVehicleView { id:string;model:string;vin:string;plate:string|null;spawned:boolean;locked:boolean; }
export interface FamilyStorageView { inventory:InventoryView; }
export interface FamilyStorageTransferRequest { itemId:string;quantity:number;direction:'deposit'|'withdraw'; }
export interface FamilyUpgradeView { key:string;name:string;description:string;level:number;maxLevel:number;nextPrice:string|null; }
export interface FamilyUpgradeRequest { key:string; }
export interface FamilyContractView { id:string;contractKey:string;progress:number;target:number;rewardMoney:string;rewardReputation:number;expiresAt:string;completedAt:string|null; }
