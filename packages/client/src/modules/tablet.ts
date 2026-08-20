import { CefEvent } from '@eclipse/shared';
import { cef } from '../core/browser';
import { isInWorld } from '../core/world';

let open = false;

const closeTablet = (): void => {
  if (!open) return;
  open = false;
  cef.screen('blank');
  cef.focus(false);
};

const toggleTablet = (): void => {
  if (!isInWorld()) return;
  if (open) { closeTablet(); return; }
  open = true;
  cef.screen('tablet');
  cef.focus(true);
};

export const registerTabletModule = (): void => {
  mp.keys.bind(0x28, true, toggleTablet); // Arrow Down
  mp.keys.bind(0x1B, true, closeTablet);
  mp.events.add(CefEvent.OverlayClose, closeTablet);
};
