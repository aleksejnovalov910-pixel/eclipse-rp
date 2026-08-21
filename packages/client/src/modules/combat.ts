import { RpcEvent,ServerEvent,type CharacterWeaponView } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
const apply=(payload:string):void=>{try{const weapons=JSON.parse(payload) as CharacterWeaponView[];const api=mp.game.weapon as any;api.removeAllPedWeapons(mp.players.local.handle,true);for(const w of weapons){const hash=mp.game.joaat(w.weaponName);api.giveWeaponToPed(mp.players.local.handle,hash,Math.max(0,w.ammo),false,false);}}catch{}};
export const registerCombatModule=():void=>{allowFromCef(RpcEvent.WeaponShops,RpcEvent.WeaponShopProducts,RpcEvent.CharacterWeapons,RpcEvent.WeaponShopBuy);mp.events.add(ServerEvent.WeaponLoadout,apply);};
