import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerFamilyModule = (): void => {
  allowFromCef(RpcEvent.FamilyGet, RpcEvent.FamilyCreate);
};
