export interface DealershipOfferView { id:string; dealershipId:string; dealershipName:string; model:string; displayName:string; price:string; stock:number; position:{x:number;y:number;z:number}; }
export interface DealershipPurchaseResult { vehicleId:string; vin:string; model:string; displayName:string; bank:string; }
export interface DealershipTestDriveResult { offerId:string; expiresAt:string; }
