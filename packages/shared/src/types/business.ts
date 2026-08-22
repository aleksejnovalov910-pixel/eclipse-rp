export interface BusinessPoint { x:number;y:number;z:number; }
export interface BusinessView { id:string;kind:string;name:string;price:string;owned:boolean;ownedByMe:boolean;cashBalance:string;bankBalance:string;stock:number;stockCapacity:number;wholesaleUnitCost:string;markupPercent:number;position:BusinessPoint; }
export interface BusinessPurchaseResult { business:BusinessView;bank:string; }
export interface BusinessSaleResult { businessId:string;refund:string;bank:string; }
export interface BusinessTreasuryResult { business:BusinessView;characterBank:string; }
export interface BusinessRestockResult { business:BusinessView;totalCost:string; }
export interface BusinessEmployeeView { characterId:number;name:string;role:'employee'|'manager';salary:string;hiredAt:string; }
export interface BusinessEmployeeRequest { businessId:string;characterId:number; }
export interface BusinessEmployeeUpdateRequest extends BusinessEmployeeRequest { role:'employee'|'manager';salary:string; }
export interface BusinessPayrollResult { businessId:string;paidCount:number;totalPaid:string;bankBalance:string; }
export interface BusinessUpgradeView { key:'storage'|'efficiency'|'security';level:number;nextPrice:string|null; }
export interface BusinessUpgradeRequest { businessId:string;key:'storage'|'efficiency'|'security'; }
export interface BusinessAuditView { id:string;actorCharacterId:number|null;targetCharacterId:number|null;action:string;metadata:Record<string,unknown>;createdAt:string; }
