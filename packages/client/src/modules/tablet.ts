import { CefEvent } from '@eclipse/shared';
import { cef } from '../core/browser';
import { isInWorld } from '../core/world';
let open=false;
const closeTablet=():void=>{if(!open)return;open=false;cef.screen('blank');cef.focus(false);};
export const openTablet=(tab?:string):void=>{if(!isInWorld())return;open=true;cef.screen('tablet',tab?{tab}:null);cef.focus(true);};
const toggleTablet=():void=>{if(!isInWorld())return;if(open){closeTablet();return;}openTablet();};
export const registerTabletModule=():void=>{mp.keys.bind(0x28,true,toggleTablet);mp.keys.bind(0x1B,true,closeTablet);mp.events.add(CefEvent.OverlayClose,closeTablet);};
