import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
const PREVIEW='eclipse:vehicle:tuningPreview';
export const registerVehicleModule=():void=>{allowFromCef(RpcEvent.VehicleList,RpcEvent.VehicleUsableList,RpcEvent.VehicleSpawn,RpcEvent.VehicleStore,RpcEvent.VehicleToggleLock,RpcEvent.VehicleAccessList,RpcEvent.VehicleAccessGrant,RpcEvent.VehicleAccessRevoke,RpcEvent.VehicleServiceShops,RpcEvent.VehicleRepairQuote,RpcEvent.VehicleRepair,RpcEvent.VehicleTuningOptions,RpcEvent.VehicleTuningState,RpcEvent.VehicleTuningInstall,PREVIEW,RpcEvent.FuelStations,RpcEvent.VehicleRefuel);};
