import { ErrorCode, RpcEvent, SessionState, err, ok, type VehicleView } from '@eclipse/shared';
import { consume } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import { listOwnedVehicles } from './vehicle.service';

export const registerVehicleModule = (): void => {
  onRpc<unknown, VehicleView[]>(RpcEvent.VehicleList, async (ctx) => {
    const limited = consume(ctx.session, 'vehicle:list', { max: 30, windowMs: 60_000 });
    if (limited) return limited;
    if (ctx.session.state !== SessionState.Playing || ctx.session.characterId === null) {
      return err(ErrorCode.Unauthorized);
    }
    return ok(await listOwnedVehicles(ctx.session.characterId));
  });
};
