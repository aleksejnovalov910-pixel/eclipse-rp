export interface BusinessPoint { x:number; y:number; z:number; }
export interface BusinessView {
  id:string;
  kind:string;
  name:string;
  price:string;
  owned:boolean;
  ownedByMe:boolean;
  cashBalance:string;
  bankBalance:string;
  stock:number;
  stockCapacity:number;
  wholesaleUnitCost:string;
  markupPercent:number;
  position:BusinessPoint;
}
export interface BusinessPurchaseResult { business:BusinessView; bank:string; }
export interface BusinessSaleResult { businessId:string; refund:string; bank:string; }
export interface BusinessTreasuryResult { business:BusinessView; characterBank:string; }
export interface BusinessRestockResult { business:BusinessView; totalCost:string; }
