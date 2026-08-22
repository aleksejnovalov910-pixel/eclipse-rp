import { RpcEvent,ServerEvent,type TattooView } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

const applyTattoos=(tattoos:TattooView[]):void=>{
  const player=mp.players.local as PlayerMp & {clearDecorations?:()=>void;setDecoration?:(collection:number,overlay:number)=>void};
  if(typeof player.clearDecorations==='function')player.clearDecorations();
  if(typeof player.setDecoration!=='function')return;
  for(const tattoo of tattoos){
    player.setDecoration(mp.game.joaat(tattoo.collection),mp.game.joaat(tattoo.overlay));
  }
};

export const registerCustomizationModule=():void=>{
  allowFromCef(
    RpcEvent.CustomizationShops,RpcEvent.ClothingCatalog,RpcEvent.ClothingCurrent,RpcEvent.ClothingBuy,RpcEvent.ClothingEquip,
    RpcEvent.BarberCatalog,RpcEvent.BarberApply,RpcEvent.TattooCatalog,RpcEvent.TattooCurrent,RpcEvent.TattooBuy,
  );
  mp.events.add(ServerEvent.TattooState,(payloadJson:string)=>{
    try{applyTattoos(JSON.parse(payloadJson) as TattooView[]);}catch{/* malformed payload is ignored */}
  });
};
