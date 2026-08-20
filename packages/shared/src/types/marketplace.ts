export type MarketplaceObjectType='vehicle'|'property'|'business';
export interface MarketplaceListingView{ id:string;sellerCharacterId:number;objectType:MarketplaceObjectType;objectId:string;title:string;price:string;status:string;expiresAt:string;createdAt:string;ownedByMe:boolean; }
export interface MarketplaceCreateRequest{ objectType:MarketplaceObjectType;objectId:string;title:string;price:string; }
export interface MarketplacePurchaseResult{ listing:MarketplaceListingView; buyerBank:string; sellerBank:string; commission:string; }
