import { CefEvent, RpcEvent } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
import { cef } from '../core/browser';
import { isInWorld } from '../core/world';

let open = false;

const closePhone = (): void => {
  if (!open) return;
  open = false;
  cef.screen('blank');
  cef.focus(false);
};

const togglePhone = (): void => {
  if (!isInWorld()) return;
  if (open) { closePhone(); return; }
  open = true;
  cef.screen('phone');
  cef.focus(true);
};

export const registerPhoneModule = (): void => {
  allowFromCef(
    RpcEvent.PhoneProfile,
    RpcEvent.PhoneContacts,
    RpcEvent.PhoneContactSave,
    RpcEvent.PhoneMessages,
    RpcEvent.PhoneSendMessage,
  );

  mp.keys.bind(0x26, true, togglePhone); // Arrow Up
  mp.keys.bind(0x1B, true, closePhone); // Escape
  mp.events.add(CefEvent.OverlayClose, closePhone);
};
