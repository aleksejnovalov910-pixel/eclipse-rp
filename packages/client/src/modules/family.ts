import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerFamilyModule = (): void => {
  allowFromCef(
    RpcEvent.FamilyGet,
    RpcEvent.FamilyCreate,
    RpcEvent.FamilyMembers,
    RpcEvent.FamilyRanks,
    RpcEvent.FamilySetRank,
    RpcEvent.FamilyKick,
    RpcEvent.FamilyAudit,
    RpcEvent.FamilyInvite,
    RpcEvent.FamilyInvitation,
    RpcEvent.FamilyAcceptInvite,
    RpcEvent.FamilyLeave,
    RpcEvent.FamilyTreasuryDeposit,
    RpcEvent.FamilyTreasuryWithdraw,
    RpcEvent.FamilyVehicles,
    RpcEvent.FamilyVehicleSpawn,
    RpcEvent.FamilyVehicleStore,
    RpcEvent.FamilyStorage,
    RpcEvent.FamilyStorageTransfer,
    RpcEvent.FamilyContracts,
    RpcEvent.FamilyUpgrades,
    RpcEvent.FamilyUpgradeBuy,
  );
};
