import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerVehicleModule = (): void => {
  allowFromCef(
    RpcEvent.VehicleList,
    RpcEvent.VehicleSpawn,
    RpcEvent.VehicleStore,
    RpcEvent.VehicleToggleLock,
  );
};
