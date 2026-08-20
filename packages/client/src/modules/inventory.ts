import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerInventoryModule = (): void => {
  allowFromCef(
    RpcEvent.InventoryGet,
    RpcEvent.InventoryMove,
    RpcEvent.InventorySplit,
  );
};
