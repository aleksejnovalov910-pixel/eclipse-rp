import { RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerPhoneModule = (): void => {
  allowFromCef(
    RpcEvent.PhoneProfile,
    RpcEvent.PhoneContacts,
    RpcEvent.PhoneContactSave,
    RpcEvent.PhoneMessages,
    RpcEvent.PhoneSendMessage,
  );
};
