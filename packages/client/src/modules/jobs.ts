import { NotifyType,RpcEvent,ServerEvent,type JobAssignmentView } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';
import { cef } from '../core/browser';
export const registerJobModule=():void=>{allowFromCef(RpcEvent.JobProgress,RpcEvent.JobActive,RpcEvent.JobStart,RpcEvent.JobCompleteStep,RpcEvent.JobCancel);
 mp.events.add(ServerEvent.JobTarget,(payloadJson:string)=>{try{const assignment=JSON.parse(payloadJson) as JobAssignmentView|null;if(!assignment)return;const target=assignment.target;if(![target.x,target.y,target.z].every(Number.isFinite))return;mp.game.ui.setNewWaypoint(target.x,target.y);const seconds=Math.max(1,Math.ceil(assignment.actionDurationMs/1000));const vehicle=assignment.vehicleRequired?' · требуется транспорт':'';cef.notify(NotifyType.Info,`${assignment.currentAction} · ~${seconds} сек${vehicle}`);}catch{}});
};
