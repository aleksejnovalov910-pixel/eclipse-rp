import { ErrorCode,RpcEvent,SessionState,err,ok,type BusinessPurchaseResult,type BusinessRestockResult,type BusinessSaleResult,type BusinessTreasuryResult,type BusinessView } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './business.service';

const id=(ctx:any):number|null=>ctx.session.state===SessionState.Playing&&ctx.session.characterId!==null?ctx.session.characterId:null;
const map=(e:unknown)=>{const c=e instanceof Error?e.message:'';if(c==='INSUFFICIENT_FUNDS')return ErrorCode.InsufficientFunds;if(c.startsWith('INVALID_')||c==='STOCK_CAPACITY')return ErrorCode.Validation;if(c==='BUSINESS_NOT_FOUND'||c==='BUSINESS_OWNED'||c==='BUSINESS_NOT_OWNED')return ErrorCode.Validation;return ErrorCode.Internal;};
export const registerBusinessModule=():void=>{
  const read={max:40,windowMs:60000},write={max:20,windowMs:60000};
  onRpc<unknown,BusinessView[]>(RpcEvent.BusinessCatalog,async ctx=>{const l=consume(ctx.session,'business:catalog',read);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);return ok(await service.catalog(c));});
  onRpc<unknown,BusinessView[]>(RpcEvent.BusinessOwned,async ctx=>{const l=consume(ctx.session,'business:owned',read);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);return ok(await service.owned(c));});
  onRpc<{businessId:string},BusinessPurchaseResult>(RpcEvent.BusinessBuy,async(ctx,p)=>{const l=consume(ctx.session,'business:buy',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.buy(c,p?.businessId??''));}catch(e){return err(map(e));}});
  onRpc<{businessId:string},BusinessSaleResult>(RpcEvent.BusinessSell,async(ctx,p)=>{const l=consume(ctx.session,'business:sell',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.sell(c,p?.businessId??''));}catch(e){return err(map(e));}});
  onRpc<{businessId:string;amount:string},BusinessTreasuryResult>(RpcEvent.BusinessDeposit,async(ctx,p)=>{const l=consume(ctx.session,'business:deposit',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.deposit(c,p?.businessId??'',p?.amount??''));}catch(e){return err(map(e));}});
  onRpc<{businessId:string;amount:string},BusinessTreasuryResult>(RpcEvent.BusinessWithdraw,async(ctx,p)=>{const l=consume(ctx.session,'business:withdraw',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.withdraw(c,p?.businessId??'',p?.amount??''));}catch(e){return err(map(e));}});
  onRpc<{businessId:string;quantity:number},BusinessRestockResult>(RpcEvent.BusinessRestock,async(ctx,p)=>{const l=consume(ctx.session,'business:restock',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.restock(c,p?.businessId??'',p?.quantity));}catch(e){return err(map(e));}});
  onRpc<{businessId:string;markupPercent:number},BusinessView>(RpcEvent.BusinessSetMarkup,async(ctx,p)=>{const l=consume(ctx.session,'business:markup',write);if(l)return l;const c=id(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.setMarkup(c,p?.businessId??'',p?.markupPercent));}catch(e){return err(map(e));}});
};
