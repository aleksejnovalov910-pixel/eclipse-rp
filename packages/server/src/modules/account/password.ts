import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Хэширование паролей.
 *
 * Используется scrypt из стандартной библиотеки Node. Причина выбора:
 * argon2 и bcrypt — нативные модули, а рантайм RAGE MP регулярно ломает
 * сборку нативных биндингов при обновлении. scrypt — memory-hard KDF,
 * рекомендованный OWASP, и доступен без единой зависимости.
 *
 * Параметры (N=2^15, r=8, p=1) дают ~64 МБ памяти на хэш и ~100 мс на
 * современном CPU. Этого достаточно, чтобы офлайн-перебор украденной базы
 * был непрактичным, и мало, чтобы вход не тормозил.
 *
 * Формат хранения: scrypt$N$r$p$<salt base64>$<hash base64>
 * Параметры лежат внутри строки — это позволит поднять стоимость в будущем
 * и продолжить проверять старые хэши без миграции базы.
 */

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// scrypt требует maxmem >= 128 * N * r; берём с запасом.
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), derived.toString('base64')].join('$');
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number.parseInt(parts[1] ?? '', 10);
  const r = Number.parseInt(parts[2] ?? '', 10);
  const p = Number.parseInt(parts[3] ?? '', 10);
  const saltB64 = parts[4];
  const hashB64 = parts[5];

  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !saltB64 || !hashB64) return false;

  const expected = Buffer.from(hashB64, 'base64');
  const derived = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2,
  });

  // Сравнение постоянного времени — иначе длина совпадающего префикса
  // утекает через тайминги.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
};

/**
 * Нужно ли перехэшировать пароль под текущие параметры.
 * Вызывается после успешного входа: пользователь как раз предоставил
 * пароль в открытом виде, это единственный момент, когда апгрейд возможен.
 */
export const needsRehash = (stored: string): boolean => {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return (
    Number.parseInt(parts[1] ?? '', 10) !== PARAMS.N ||
    Number.parseInt(parts[2] ?? '', 10) !== PARAMS.r ||
    Number.parseInt(parts[3] ?? '', 10) !== PARAMS.p
  );
};
