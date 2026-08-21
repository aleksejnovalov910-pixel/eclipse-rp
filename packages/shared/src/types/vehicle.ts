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

export interface VehicleActionView {
  vehicle: VehicleView;
  spawned: boolean;
}

export interface VehicleAccessView {
  characterId: number;
  firstName: string;
  lastName: string;
  accessLevel: 'driver' | 'manager';
  createdAt: string;
}

export interface VehicleServiceShopView {
  id: string;
  name: string;
  stock: number;
  priceMultiplier: number;
  position: { x: number; y: number; z: number };
}

export interface VehicleRepairQuote {
  vehicleId: string;
  businessId: string;
  engineDamage: number;
  bodyDamage: number;
  total: string;
}

export interface VehicleRepairResult {
  vehicle: VehicleView;
  paid: string;
  bank: string;
}
