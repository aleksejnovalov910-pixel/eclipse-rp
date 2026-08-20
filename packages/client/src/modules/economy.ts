import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerEconomyModule = (): void => {
  allowFromCef(
    RpcEvent.EconomyBalance,
    RpcEvent.EconomyDeposit,
    RpcEvent.EconomyWithdraw,
    RpcEvent.EconomyTransfer,
  );
};
