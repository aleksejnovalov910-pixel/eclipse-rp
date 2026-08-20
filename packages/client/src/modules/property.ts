import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerPropertyModule = (): void => {
  allowFromCef(
    RpcEvent.PropertyCatalog,
    RpcEvent.PropertyOwned,
    RpcEvent.PropertyBuy,
    RpcEvent.PropertySell,
    RpcEvent.PropertyEnter,
    RpcEvent.PropertyExit,
  );
};
