export type MarketplaceObjectType='vehicle'|'property'|'business'|'item';
export type MarketplaceListingType='fixed'|'auction';
export type MarketplaceSort='newest'|'price_asc'|'price_desc'|'ending';
export interface MarketplaceListingView{ id:string;sellerCharacterId:number;objectType:MarketplaceObjectType;objectId:string;title:string;price:string;status:string;expiresAt:string;createdAt:string;ownedByMe:boolean;listingType:MarketplaceListingType;quantity:number;currentBid:string|null;highestBidderCharacterId:number|null;auctionEndsAt:string|null; }
export interface MarketplaceCreateRequest{ objectType:MarketplaceObjectType;objectId:string;title:string;price:string;listingType?:MarketplaceListingType;quantity?:number;durationHours?:number; }
export interface MarketplaceSearchRequest{ query?:string;objectType?:MarketplaceObjectType|'all';listingType?:MarketplaceListingType|'all';minPrice?:string;maxPrice?:string;sort?:MarketplaceSort;limit?:number; }
export interface MarketplacePurchaseResult{ listing:MarketplaceListingView;buyerBank:string;sellerBank:string;commission:string; }
export interface MarketplaceBidRequest{ listingId:string;amount:string; }
export interface MarketplaceBidResult{ listing:MarketplaceListingView;bidderBank:string; }
export interface MarketplaceHistoryView{ id:string;listingId:string;kind:'sale'|'purchase'|'bid'|'auction_win'|'auction_sale';objectType:MarketplaceObjectType;title:string;amount:string;counterpartyCharacterId:number|null;createdAt:string; }
