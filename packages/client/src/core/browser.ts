import { CefEvent } from '@eclipse/shared';

const CEF_URL = 'package://eclipse/cef/index.html';
let browser: BrowserMp | null = null;
let cefReady = false;
const queue: string[] = [];
const flush=():void=>{if(!browser)return;while(queue.length>0){const call=queue.shift();if(call)browser.execute(call);}};
const send=(event:string,payload:unknown):void=>{const call=`window.__eclipse && window.__eclipse.receive(${JSON.stringify(event)}, ${JSON.stringify(JSON.stringify(payload))})`;if(browser&&cefReady)browser.execute(call);else queue.push(call);};
export const cef={
 create():void{if(browser)return;browser=mp.browsers.new(CEF_URL);mp.events.add(CefEvent.Ready,()=>{cefReady=true;flush();});},
 screen(name:string,data:unknown=null):void{send(CefEvent.Screen,{name,data});},
 notify(type:string,text:string):void{send(CefEvent.Notify,{type,text});},
 reply(requestId:string,result:unknown):void{send(CefEvent.RpcReply,{requestId,result});},
 event(event:string,payload:unknown):void{send(event,payload);},
 focus(enabled:boolean):void{mp.gui.cursor.show(enabled,enabled);mp.game.ui.displayRadar(!enabled);},
 destroy():void{if(!browser)return;browser.destroy();browser=null;cefReady=false;queue.length=0;},
};