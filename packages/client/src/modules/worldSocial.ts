import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerWorldSocialModule=():void=>allowFromCef(
 RpcEvent.DocumentGet,RpcEvent.DocumentIssueLicense,RpcEvent.DocumentRevokeLicense,
 RpcEvent.CriminalGet,RpcEvent.CriminalTerritories,RpcEvent.CriminalContracts,RpcEvent.CriminalSetRank
);
