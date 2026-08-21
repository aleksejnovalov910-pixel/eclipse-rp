export interface WeaponShopView{id:string;name:string;position:{x:number;y:number;z:number};radius:number;}
export interface WeaponShopProductView{id:string;shopId:string;kind:'weapon'|'ammo'|'armour';weaponKey:string|null;name:string;amount:number;price:string;levelRequired:number;}
export interface CharacterWeaponView{weaponKey:string;name:string;weaponName:string;ammo:number;maxAmmo:number;}
export interface WeaponPurchaseRequest{productId:string;}
export interface WeaponPurchaseResult{paid:string;bank:string;armour:number;weapons:CharacterWeaponView[];}
