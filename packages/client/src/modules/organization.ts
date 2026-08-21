import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
export const registerOrganizationModule=():void=>allowFromCef(
 RpcEvent.OrganizationGet,RpcEvent.OrganizationMembers,RpcEvent.OrganizationDuty,RpcEvent.OrganizationCalls,
 RpcEvent.OrganizationCreateCall,RpcEvent.OrganizationAssignCall,RpcEvent.OrganizationCloseCall,
 RpcEvent.PoliceCitizen,RpcEvent.PoliceAddRecord,RpcEvent.PoliceResolveRecord,RpcEvent.EmsPatient,RpcEvent.EmsTreat
);
