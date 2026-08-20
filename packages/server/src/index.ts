import { ServerEvent, SessionState } from '@eclipse/shared';
import { loadConfig } from './core/config';
import { createLogger, setLogLevel } from './core/logger';
import { sessions } from './core/session';
import { connectDatabase, disconnectDatabase } from './infra/db';
import { cache } from './infra/cache';
import { registerAccountModule } from './modules/account/account.controller';
import { registerCharacterModule } from './modules/character/character.controller';
import { registerEconomyModule } from './modules/economy/economy.controller';
import { persist, saveAll, snapshot, startAutosave, stopAutosave } from './modules/character/character.state';

/**
 * Точка входа server-side пакета ECLIPSE RP.
 *
 * Порядок запуска важен и намеренно последователен:
 *   1. конфигурация  — падаем сразу, если окружение неполное;
 *   2. база данных   — без неё ни один модуль не имеет смысла;
 *   3. кэш;
 *   4. игровые модули — регистрируют свои RPC-обработчики;
 *   5. обработчики жизненного цикла игрока.
 *
 * До завершения шага 4 сервер не принимает RPC: игрок, подключившийся в
 * этот момент, останется в состоянии Connecting и получит корректный отказ,
 * а не «тихо ничего не произошло».
 */

const log = createLogger('boot');

let ready = false;
let bootFailed = false;

const bootstrap = async (): Promise<void> => {
  const config = loadConfig();
  setLogLevel(config.logLevel);

  log.info(`запуск ${config.serverName} (env=${config.env})`);

  /**
   * Обработчики жизненного цикла регистрируются ПЕРВЫМИ, до базы и модулей.
   *
   * Причина найдена дымовым тестом: если сначала подключаться к базе и она
   * недоступна, то `playerJoin` не регистрируется вовсе — и подключившийся
   * игрок молча попадает в мир без сессии, без авторизации и без единого
   * обработчика. Отказ во входе с понятным сообщением несравнимо лучше, чем
   * открытый сервер без правил.
   */
  registerLifecycle();

  try {
    await connectDatabase();
  } catch (error) {
    bootFailed = true;
    throw error;
  }

  cache();

  registerAccountModule();
  registerCharacterModule();
  registerEconomyModule();
  startAutosave(config.world.autosaveSeconds);

  ready = true;
  log.info('сервер готов принимать игроков');
};

const registerLifecycle = (): void => {
  mp.events.add('playerJoin', (player: PlayerMp) => {
    if (!ready) {
      // Сессию не открываем: незачем создавать состояние для того, кого мы
      // прямо сейчас отключаем. Формулировка различает две ситуации —
      // игроку важно понимать, ждать ему полминуты или заходить позже.
      player.kick(
        bootFailed
          ? 'Технические работы. Сервер временно недоступен, попробуйте позже.'
          : 'Сервер ещё запускается. Пожалуйста, переподключитесь через несколько секунд.',
      );
      return;
    }

    const session = sessions.open(player);
    session.state = SessionState.Authenticating;
    log.info(`подключился ${player.socialClub} (онлайн: ${sessions.size})`);
  });

  /**
   * Клиент сообщает, что CEF поднят и готов принимать состояние.
   * Отправлять состояние в playerJoin бессмысленно: браузер в этот момент
   * ещё не существует, и сообщение было бы потеряно.
   */
  mp.events.add('eclipse:client:ready', (player: PlayerMp) => {
    const session = sessions.get(player);
    if (!session) return;
    player.call(ServerEvent.SessionState, [session.state]);
  });

  mp.events.add('playerQuit', (player: PlayerMp, exitType: string, reason: string) => {
    const session = sessions.get(player);

    /**
     * Снимок снимается СИНХРОННО, до закрытия сессии и до любого await.
     * Сущность игрока валидна только внутри этого обработчика: после первой
     * асинхронной паузы обращение к player.position уже может выбросить
     * исключение, и состояние будет потеряно именно у тех, кто вылетел.
     */
    const state = session ? snapshot(player, session) : null;

    sessions.close(player);
    log.info(`отключился ${player.socialClub} (${exitType}${reason ? `: ${reason}` : ''})`);

    if (state) {
      void persist(state).catch((error) => {
        log.error(`не удалось сохранить персонажа ${state.characterId} при выходе`, error);
      });
    }
  });
};

let shuttingDown = false;

/**
 * Остановка сервера.
 *
 * Порядок обязателен: сначала перестаём принимать новых игроков, затем
 * сохраняем всех, кто в мире, и только потом закрываем соединение с базой.
 * Закрыть базу раньше — значит гарантированно потерять прогресс всего онлайна.
 */
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn(`получен ${signal}, завершение работы`);
  ready = false;
  stopAutosave();

  try {
    await saveAll('остановка сервера');
  } catch (error) {
    log.error('ошибка при сохранении игроков перед остановкой', error);
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    log.error('ошибка при закрытии соединения с базой', error);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  // Необработанный reject не должен ронять игровой сервер вместе с игроками.
  log.error('unhandledRejection', reason);
});

bootstrap().catch((error) => {
  log.error('критический сбой при запуске — сервер не будет работать корректно', error);
});
