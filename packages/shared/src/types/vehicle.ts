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
}
