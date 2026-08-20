import { RpcEvent, type AuthSuccess, type LoginRequest, type RegisterRequest, type Result } from '@eclipse/shared';
import { loadConfig } from '../../core/config';
import { consume, reset } from '../../core/rateLimit';
import { onRpc } from '../../core/rpc';
import * as service from './account.service';

/**
 * Транспортный слой модуля аккаунтов: связывает RPC-события с сервисом.
 * Здесь нет бизнес-логики — только лимиты и делегирование.
 */

export const registerAccountModule = (): void => {
  const auth = loadConfig().auth;

  const loginRule = { max: auth.maxAttempts, windowMs: auth.lockoutSeconds * 1000 };
  // Регистрация дороже входа (создание хэша), поэтому лимит жёстче.
  const registerRule = { max: 3, windowMs: 10 * 60 * 1000 };

  onRpc<LoginRequest, AuthSuccess>(RpcEvent.AuthLogin, async (ctx, payload): Promise<Result<AuthSuccess>> => {
    const limited = consume(ctx.session, 'auth:login', loginRule);
    if (limited) return limited;

    const result = await service.login(ctx.session, ctx.player, payload);
    // Успешный вход снимает накопленные неудачные попытки.
    if (result.ok) reset(ctx.session, 'auth:login');
    return result;
  });

  onRpc<RegisterRequest, AuthSuccess>(RpcEvent.AuthRegister, async (ctx, payload): Promise<Result<AuthSuccess>> => {
    const limited = consume(ctx.session, 'auth:register', registerRule);
    if (limited) return limited;

    return service.register(ctx.session, ctx.player, payload);
  });
};
