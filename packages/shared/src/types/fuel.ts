export interface FuelStationView { id:string;name:string;stock:number;pricePerLiter:string;position:{x:number;y:number;z:number}; }
export interface VehicleRefuelResult { vehicleId:string;fuel:string;liters:number;totalCost:string;bank:string;station:FuelStationView; }
