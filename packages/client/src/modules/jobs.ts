import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerJobModule = (): void => {
  allowFromCef(RpcEvent.JobProgress);
};
