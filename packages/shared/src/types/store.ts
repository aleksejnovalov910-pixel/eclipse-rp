export interface StoreProductView { businessId:string; businessName:string; itemKey:string; name:string; category:string; price:string; stock:number; position:{x:number;y:number;z:number}; }
export interface StorePurchaseResult { itemKey:string; quantity:number; total:string; bank:string; }
