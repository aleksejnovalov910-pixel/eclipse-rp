import { CefEvent,RpcEvent,ServerEvent,type DocumentView,type VehicleDocumentView } from '@eclipse/shared';
import { cef } from '../core/browser';import { allowFromCef } from '../core/cefBridge';
const present=(kind:'passport'|'vehicle',raw:string):void=>{try{const data=JSON.parse(raw) as DocumentView|VehicleDocumentView;cef.event(CefEvent.DocumentPresentation,{visible:true,kind,data});cef.focus(true);}catch{}};
export const registerWorldSocialModule=():void=>{allowFromCef(
 RpcEvent.DocumentGet,RpcEvent.DocumentIssueLicense,RpcEvent.DocumentRevokeLicense,RpcEvent.DocumentShow,RpcEvent.VehicleDocumentShow,
 RpcEvent.CriminalGet,RpcEvent.CriminalTerritories,RpcEvent.CriminalContracts,RpcEvent.CriminalSetRank,
 RpcEvent.CustomizationShops,RpcEvent.ClothingCatalog,RpcEvent.ClothingCurrent,RpcEvent.ClothingBuy,RpcEvent.ClothingEquip
);mp.events.add(ServerEvent.DocumentPresented,(raw:string)=>present('passport',raw));mp.events.add(ServerEvent.VehicleDocumentPresented,(raw:string)=>present('vehicle',raw));};
