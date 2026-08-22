import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerBusinessModule=():void=>{allowFromCef(RpcEvent.BusinessCatalog,RpcEvent.BusinessOwned,RpcEvent.BusinessBuy,RpcEvent.BusinessSell,RpcEvent.BusinessDeposit,RpcEvent.BusinessWithdraw,RpcEvent.BusinessRestock,RpcEvent.BusinessSetMarkup,RpcEvent.BusinessEmployees,RpcEvent.BusinessHire,RpcEvent.BusinessEmployeeUpdate,RpcEvent.BusinessFire,RpcEvent.BusinessPayroll,RpcEvent.BusinessUpgrades,RpcEvent.BusinessUpgradeBuy,RpcEvent.BusinessAudit);};
