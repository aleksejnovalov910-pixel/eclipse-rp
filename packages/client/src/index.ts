import { cef } from './core/browser';
import { installCefBridge } from './core/cefBridge';
import { isInWorld } from './core/world';
import { registerAuthModule } from './modules/auth';
import { registerCharacterModule } from './modules/character';
import { registerSessionModule } from './modules/session';
import { registerEconomyModule } from './modules/economy';
import { registerInventoryModule } from './modules/inventory';
import { registerJobModule } from './modules/jobs';
import { registerFamilyModule } from './modules/family';
import { registerVehicleModule } from './modules/vehicle';

mp.events.add('render', () => {
  if (!isInWorld()) mp.game.controls.disableAllControlActions(0);
});

const prepareEntryScene = (): void => {
  const local = mp.players.local;
  local.freezePosition(true);
  local.setInvincible(true);
  mp.game.ui.displayRadar(false);
  mp.gui.chat.activate(false);
  mp.gui.chat.show(false);
  cef.create();
  cef.screen('auth');
  cef.focus(true);
};

mp.events.add('playerReady', () => {
  installCefBridge();
  registerAuthModule();
  registerCharacterModule();
  registerSessionModule();
  registerEconomyModule();
  registerInventoryModule();
  registerJobModule();
  registerFamilyModule();
  registerVehicleModule();
  prepareEntryScene();
  mp.events.callRemote('eclipse:client:ready');
});
