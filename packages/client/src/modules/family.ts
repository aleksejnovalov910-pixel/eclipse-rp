import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerFamilyModule = (): void => {
  allowFromCef(
    RpcEvent.FamilyGet,
    RpcEvent.FamilyCreate,
    RpcEvent.FamilyMembers,
    RpcEvent.FamilyInvite,
    RpcEvent.FamilyInvitation,
    RpcEvent.FamilyAcceptInvite,
    RpcEvent.FamilyLeave,
    RpcEvent.FamilyTreasuryDeposit,
    RpcEvent.FamilyTreasuryWithdraw,
  );
};
