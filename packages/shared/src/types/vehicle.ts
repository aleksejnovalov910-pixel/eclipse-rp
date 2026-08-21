export interface VehicleView {
  id: string;
  model: string;
  vin: string;
  plate: string | null;
  fuel: string;
  mileage: string;
  engineHealth: string;
  bodyHealth: string;
  locked: boolean;
  impounded: boolean;
  insuranceUntil: string | null;
  spawned: boolean;
}
export interface VehicleActionView { vehicle: VehicleView; spawned: boolean; }
export interface VehicleAccessView { characterId:number;firstName:string;lastName:string;accessLevel:'driver'|'manager';createdAt:string; }
export interface VehicleServiceShopView { id:string;name:string;stock:number;priceMultiplier:number;position:{x:number;y:number;z:number}; }
export interface VehicleRepairQuote { vehicleId:string;businessId:string;engineDamage:number;bodyDamage:number;total:string; }
export interface VehicleRepairResult { vehicle:VehicleView;paid:string;bank:string; }
export type VehicleTuningCategory='engine'|'brakes'|'transmission'|'suspension'|'spoiler'|'front_bumper'|'rear_bumper'|'skirts'|'hood'|'wheels'|'primary_color'|'secondary_color';
export interface VehicleTuningOption { key:string;name:string;category:VehicleTuningCategory;modType:number;modIndex:number;basePrice:string;color?:number;wheelType?:number; }
export interface VehicleTuningState { vehicleId:string; installed:Record<string,number>; }
export interface VehicleTuningInstallRequest { vehicleId:string;businessId:string;optionKey:string; }
export interface VehicleTuningInstallResult { tuning:VehicleTuningState;paid:string;bank:string; }
export interface VehicleTuningPreviewRequest { vehicleId:string;businessId:string;optionKey?:string;reset?:boolean; }
export interface VehicleTuningPreviewResult { vehicleId:string;previewing:boolean;optionKey?:string; }
