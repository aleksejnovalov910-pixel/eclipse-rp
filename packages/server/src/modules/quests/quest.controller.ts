import { ErrorCode, RpcEvent, SessionState, err, ok, type QuestView } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import { claimQuest, listQuests } from './quest.service';

export const registerQuestModule = (): void => {
  onRpc<unknown,QuestView[]>(RpcEvent.QuestList,async(ctx)=>{
    const limited=consume(ctx.session,'quests:list',{max:30,windowMs:60_000});if(limited)return limited;
    if(ctx.session.state!==SessionState.Playing||ctx.session.characterId===null)return err(ErrorCode.Unauthorized);
    return ok(await listQuests(ctx.session.characterId));
  });
  onRpc<{questKey:string},QuestView>(RpcEvent.QuestClaim,async(ctx,payload)=>{
    const limited=consume(ctx.session,'quests:claim',{max:20,windowMs:60_000});if(limited)return limited;
    if(ctx.session.state!==SessionState.Playing||ctx.session.characterId===null)return err(ErrorCode.Unauthorized);
    if(!payload||typeof payload.questKey!=='string')return err(ErrorCode.Validation);
    try{return ok(await claimQuest(ctx.session.characterId,payload.questKey));}
    catch(error){const code=error instanceof Error?error.message:'';if(code==='QUEST_NOT_FOUND')return err(ErrorCode.QuestNotFound);if(code==='QUEST_NOT_COMPLETED')return err(ErrorCode.QuestNotCompleted);if(code==='QUEST_ALREADY_CLAIMED')return err(ErrorCode.QuestAlreadyClaimed);throw error;}
  });
};
