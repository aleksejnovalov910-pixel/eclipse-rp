import type { InventoryView } from './inventory';
export type PropertyKind = 'house' | 'apartment';
export interface PropertyPoint { x:number;y:number;z:number;heading:number;dimension:number; }
export interface PropertyView { id:string;kind:PropertyKind;name:string;price:string;owned:boolean;ownedByMe:boolean;exterior:PropertyPoint;rentEnabled?:boolean;rentPrice?:string|null; }
export interface PropertyOwnedView extends PropertyView { interior:PropertyPoint;taxRate?:string;taxPaidUntil?:string|null;garageSlots?:number;tenantCharacterId?:number|null;rentPaidUntil?:string|null; }
export interface PropertyActionRequest { propertyId:string; }
export interface PropertyPurchaseResult { property:PropertyOwnedView;bank:string; }
export interface PropertySaleResult { propertyId:string;refund:string;bank:string; }
export interface PropertyRentConfigRequest extends PropertyActionRequest { enabled:boolean;price:string; }
export interface PropertyRentRequest extends PropertyActionRequest { days:number; }
export interface PropertyTaxRequest extends PropertyActionRequest { days:number; }
export interface PropertyStorageTransferRequest extends PropertyActionRequest { itemId:string;quantity:number;direction:'deposit'|'withdraw'; }
export interface PropertyFurnitureView { id:string;propertyId:string;model:string;x:number;y:number;z:number;rx:number;ry:number;rz:number; }
export interface PropertyFurniturePlaceRequest extends PropertyActionRequest { model:string;rotationZ?:number; }
export interface PropertyFurnitureRemoveRequest extends PropertyActionRequest { furnitureId:string; }
export interface PropertyGarageView { propertyId:string;slots:number;vehicleIds:string[]; }
export interface PropertyGarageVehicleRequest extends PropertyActionRequest { vehicleId:string; }
export interface PropertyStorageView extends InventoryView {}
