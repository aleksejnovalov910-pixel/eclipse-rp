import { CefEvent,RpcEvent,type BalanceView } from '@eclipse/shared';
import { cef } from '../core/browser';
import { callServer } from '../core/rpc';
import { isInWorld } from '../core/world';
let cash='0',bank='0',lastVitals=0,lastBalance=0,balanceBusy=false,voiceActive=false;
const refreshBalance=async():Promise<void>=>{if(balanceBusy||!isInWorld())return;balanceBusy=true;try{const r=await callServer<BalanceView>(RpcEvent.EconomyBalance);if(r.ok){cash=r.data.cash;bank=r.data.bank;}}finally{balanceBusy=false;}};
export const registerHudModule=():void=>{
 mp.keys.bind(0x4E,true,()=>{voiceActive=true;});
 mp.keys.bind(0x4E,false,()=>{voiceActive=false;});
 mp.events.add('render',()=>{if(!isInWorld())return;const now=Date.now();if(now-lastVitals<250)return;lastVitals=now;if(now-lastBalance>=5000){lastBalance=now;void refreshBalance();}const p=mp.players.local;const vehicle=p.vehicle;const vehicleState=vehicle?{visible:true,speed:Math.round(Math.max(0,vehicle.getSpeed()*3.6)),engine:vehicle.getIsEngineRunning()}: {visible:false,speed:0,engine:false};cef.event(CefEvent.HudState,{visible:true,health:Math.max(0,Math.min(100,p.health)),armour:Math.max(0,Math.min(100,p.armour)),cash,bank,playerId:p.remoteId,voiceActive,vehicle:vehicleState});});
};
