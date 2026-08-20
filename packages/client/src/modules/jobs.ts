import { RpcEvent, ServerEvent, type JobTarget } from '@eclipse/shared';
import { allowFromCef } from '../core/cefBridge';

export const registerJobModule = (): void => {
  allowFromCef(
    RpcEvent.JobProgress,
    RpcEvent.JobActive,
    RpcEvent.JobStart,
    RpcEvent.JobCompleteStep,
    RpcEvent.JobCancel,
  );

  mp.events.add(ServerEvent.JobTarget, (payloadJson: string) => {
    try {
      const target = JSON.parse(payloadJson) as JobTarget | null;
      if (!target) return;
      if (![target.x, target.y, target.z].every(Number.isFinite)) return;
      mp.game.ui.setNewWaypoint(target.x, target.y);
    } catch {
      // Повреждённое серверное сообщение не должно ломать клиентский пакет.
    }
  });
};
