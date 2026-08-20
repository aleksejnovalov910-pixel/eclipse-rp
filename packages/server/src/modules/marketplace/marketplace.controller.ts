import { ErrorCode,RpcEvent,SessionState,err,ok,type MarketplaceCreateRequest,type MarketplaceListingView,type MarketplacePurchaseResult } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './marketplace.service';

const cid=(ctx:any):number|null=>ctx.session.state===SessionState.Playing&&ctx.session.characterId!==null?ctx.session.characterId:null;
const map=(e:unknown)=>{const c=e instanceof Error?e.message:'';if(c==='INSUFFICIENT_FUNDS')return ErrorCode.InsufficientFunds;if(['INVALID_LISTING','INVALID_OBJECT_TYPE','OBJECT_NOT_OWNED','OBJECT_BUSY','ALREADY_LISTED','LISTING_NOT_ACTIVE','SELF_PURCHASE','CHARACTER_NOT_FOUND'].includes(c))return ErrorCode.Validation;return ErrorCode.Internal;};
export const registerMarketplaceModule=():void=>{
 const read={max:60,windowMs:60000},write={max:20,windowMs:60000};
 onRpc<unknown,MarketplaceListingView[]>(RpcEvent.MarketList,async ctx=>{const l=consume(ctx.session,'market:list',read);if(l)return l;const c=cid(ctx);if(c===null)return err(ErrorCode.Unauthorized);return ok(await service.listActive(c));});
 onRpc<unknown,MarketplaceListingView[]>(RpcEvent.MarketMine,async ctx=>{const l=consume(ctx.session,'market:mine',read);if(l)return l;const c=cid(ctx);if(c===null)return err(ErrorCode.Unauthorized);return ok(await service.listMine(c));});
 onRpc<MarketplaceCreateRequest,MarketplaceListingView>(RpcEvent.MarketCreate,async(ctx,p)=>{const l=consume(ctx.session,'market:create',write);if(l)return l;const c=cid(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.createListing(c,p));}catch(e){return err(map(e));}});
 onRpc<{listingId:string},MarketplaceListingView>(RpcEvent.MarketCancel,async(ctx,p)=>{const l=consume(ctx.session,'market:cancel',write);if(l)return l;const c=cid(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.cancelListing(c,p?.listingId??''));}catch(e){return err(map(e));}});
 onRpc<{listingId:string},MarketplacePurchaseResult>(RpcEvent.MarketBuy,async(ctx,p)=>{const l=consume(ctx.session,'market:buy',write);if(l)return l;const c=cid(ctx);if(c===null)return err(ErrorCode.Unauthorized);try{return ok(await service.buyListing(c,p?.listingId??''));}catch(e){return err(map(e));}});
};
