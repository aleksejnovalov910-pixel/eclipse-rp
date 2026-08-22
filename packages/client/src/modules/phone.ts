import { CefEvent,RpcEvent,ServerEvent,type PhoneCallStateView } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';import { cef } from '../core/browser';import { isInWorld } from '../core/world';
let open=false;const closePhone=():void=>{if(!open)return;open=false;cef.screen('blank');cef.focus(false);};const togglePhone=():void=>{if(!isInWorld())return;if(open){closePhone();return;}open=true;cef.screen('phone');cef.focus(true);};
export const registerPhoneModule=():void=>{allowFromCef(RpcEvent.PhoneProfile,RpcEvent.PhoneContacts,RpcEvent.PhoneContactSave,RpcEvent.PhoneMessages,RpcEvent.PhoneSendMessage,RpcEvent.PhoneCallState,RpcEvent.PhoneCallStart,RpcEvent.PhoneCallAnswer,RpcEvent.PhoneCallEnd,RpcEvent.PhoneCallHistory,RpcEvent.PhoneClassifieds,RpcEvent.PhoneClassifiedCreate,RpcEvent.PhoneClassifiedDelete,RpcEvent.EconomyBalance,RpcEvent.EconomyHistory,RpcEvent.EconomyTransfer,RpcEvent.MarketList,RpcEvent.MarketHistory);
 mp.keys.bind(0x26,true,togglePhone);mp.keys.bind(0x1B,true,closePhone);mp.events.add(CefEvent.OverlayClose,closePhone);
 mp.events.add(ServerEvent.PhoneCallState,(raw:string)=>{try{const state=JSON.parse(raw) as PhoneCallStateView;cef.event(CefEvent.PhoneCallState,state);if(state.phase==='incoming'&&!open){open=true;cef.screen('phone',{tab:'calls'});cef.focus(true);}}catch{}});
 mp.events.add(CefEvent.PhoneGpsSet,(raw:string)=>{try{const p=JSON.parse(raw) as{x?:number;y?:number};if(Number.isFinite(p.x)&&Number.isFinite(p.y)){mp.game.ui.setNewWaypoint(Number(p.x),Number(p.y));closePhone();}}catch{}});
};
