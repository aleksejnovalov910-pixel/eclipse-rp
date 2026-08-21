import { CefEvent,RpcEvent,type CustomizationShopView,type FuelStationView,type VehicleServiceShopView } from '@eclipse/shared';
import { cef } from '../core/browser';
import { callServer } from '../core/rpc';
import { isInWorld } from '../core/world';
import { openTablet } from './tablet';

type InteractionPoint={key:string;label:string;tab:string;position:{x:number;y:number;z:number};radius:number};
let points:InteractionPoint[]=[];let active:InteractionPoint|null=null;let lastScan=0;let refreshBusy=false;
const dist=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const refresh=async():Promise<void>=>{if(refreshBusy||!isInWorld())return;refreshBusy=true;try{const[s,f,r]=await Promise.all([callServer<CustomizationShopView[]>(RpcEvent.CustomizationShops),callServer<FuelStationView[]>(RpcEvent.FuelStations),callServer<VehicleServiceShopView[]>(RpcEvent.VehicleServiceShops)]);const next:InteractionPoint[]=[];if(s.ok)for(const x of s.data)next.push({key:`custom:${x.id}`,label:x.kind==='clothing'?`Магазин одежды · ${x.name}`:x.kind==='barber'?`Барбершоп · ${x.name}`:`Тату-салон · ${x.name}`,tab:x.kind==='clothing'?'clothing':'grooming',position:x.position,radius:Math.max(3,x.radius)});if(f.ok)for(const x of f.data)next.push({key:`fuel:${x.id}`,label:`АЗС · ${x.name}`,tab:'fuel',position:x.position,radius:10});if(r.ok)for(const x of r.data)next.push({key:`service:${x.id}`,label:`Автосервис · ${x.name}`,tab:'tuning',position:x.position,radius:12});points=next;}finally{refreshBusy=false;}};
const setActive=(next:InteractionPoint|null):void=>{if(active?.key===next?.key)return;active=next;cef.event(CefEvent.InteractionPrompt,next?{visible:true,key:'E',label:next.label}: {visible:false});};
export const registerWorldInteractionModule=():void=>{
 mp.events.add('render',()=>{if(!isInWorld()){setActive(null);return;}const now=Date.now();if(now-lastScan<150)return;lastScan=now;const p=mp.players.local.position;let nearest:InteractionPoint|null=null,best=Infinity;for(const x of points){const d=dist(p,x.position);if(d<=x.radius&&d<best){nearest=x;best=d;}}setActive(nearest);});
 mp.keys.bind(0x45,true,()=>{if(!isInWorld()||!active)return;openTablet(active.tab);});
 setInterval(()=>void refresh(),60000);setTimeout(()=>void refresh(),1500);
};
