export interface ClothingComponentState{drawable:number;texture:number}
export type OutfitComponents=Record<string,ClothingComponentState>;
export interface CustomizationShopView{id:string;key:string;kind:'clothing'|'barber'|'tattoo';name:string;position:{x:number;y:number;z:number};radius:number}
export interface ClothingCatalogItem{key:string;gender:'male'|'female'|'unisex';category:string;componentId:number;drawable:number;texture:number;name:string;price:string;owned:boolean;equipped:boolean}
export interface OutfitView{components:OutfitComponents}
export interface ClothingCatalogRequest{shopId?:string}
export interface ClothingBuyRequest{itemKey:string}
export interface ClothingEquipRequest{itemKey:string}
