import { sql } from 'kysely';
import { db } from '../../infra/db';

const MONEY_RE = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

const normalizeMoney = (value: string): string => {
  const trimmed = value.trim();
  if (!MONEY_RE.test(trimmed) || trimmed === '0' || trimmed === '0.0' || trimmed === '0.00') {
    throw new Error('INVALID_AMOUNT');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
};

export interface BalanceSnapshot {
  cash: string;
  bank: string;
}

export const getBalance = async (characterId: number): Promise<BalanceSnapshot> => {
  const row = await db()
    .selectFrom('characters')
    .select(['cash', 'bank'])
    .where('id', '=', characterId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!row) throw new Error('CHARACTER_NOT_FOUND');
  return row;
};

/**
 * Перевод между банковскими счетами персонажей.
 * Балансы блокируются FOR UPDATE и меняются одной транзакцией. Никаких
 * чтение→JS-арифметика→запись: NUMERIC остаётся внутри PostgreSQL.
 */
export const transferBank = async (
  fromCharacterId: number,
  toCharacterId: number,
  amountInput: string,
  description = 'Перевод',
): Promise<void> => {
  if (fromCharacterId === toCharacterId) throw new Error('SAME_ACCOUNT');
  const amount = normalizeMoney(amountInput);

  await db().transaction().execute(async (trx) => {
    // Всегда блокируем в одинаковом порядке — иначе два встречных перевода
    // способны образовать deadlock.
    const ids = [fromCharacterId, toCharacterId].sort((a, b) => a - b);
    const rows = await trx
      .selectFrom('characters')
      .select(['id', 'bank'])
      .where('id', 'in', ids)
      .where('deleted_at', 'is', null)
      .orderBy('id')
      .forUpdate()
      .execute();

    if (rows.length !== 2) throw new Error('CHARACTER_NOT_FOUND');
    const sender = rows.find((row) => row.id === fromCharacterId);
    if (!sender) throw new Error('CHARACTER_NOT_FOUND');

    // Сравнение тоже выполняет PostgreSQL как NUMERIC.
    const enough = await trx
      .selectFrom('characters')
      .select('id')
      .where('id', '=', fromCharacterId)
      .where(sql<boolean>`bank >= ${amount}::numeric`)
      .executeTakeFirst();
    if (!enough) throw new Error('INSUFFICIENT_FUNDS');

    const from = await trx
      .updateTable('characters')
      .set({ bank: sql<string>`bank - ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', fromCharacterId)
      .returning('bank')
      .executeTakeFirstOrThrow();

    const to = await trx
      .updateTable('characters')
      .set({ bank: sql<string>`bank + ${amount}::numeric`, updated_at: new Date() })
      .where('id', '=', toCharacterId)
      .returning('bank')
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('bank_transactions')
      .values([
        {
          character_id: fromCharacterId,
          counterparty_id: toCharacterId,
          kind: 'transfer_out',
          amount,
          balance_after: from.bank,
          description,
        },
        {
          character_id: toCharacterId,
          counterparty_id: fromCharacterId,
          kind: 'transfer_in',
          amount,
          balance_after: to.bank,
          description,
        },
      ])
      .execute();

    await trx
      .insertInto('economy_ledger')
      .values({
        character_id: fromCharacterId,
        family_id: null,
        source: 'bank_transfer',
        direction: 'move',
        amount,
        metadata: { toCharacterId },
      })
      .execute();
  });
};

export const depositCash = async (characterId: number, amountInput: string): Promise<void> => {
  const amount = normalizeMoney(amountInput);
  await db().transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom('characters')
      .select(['id'])
      .where('id', '=', characterId)
      .where('deleted_at', 'is', null)
      .where(sql<boolean>`cash >= ${amount}::numeric`)
      .forUpdate()
      .executeTakeFirst();
    if (!row) throw new Error('INSUFFICIENT_FUNDS');

    const updated = await trx
      .updateTable('characters')
      .set({
        cash: sql<string>`cash - ${amount}::numeric`,
        bank: sql<string>`bank + ${amount}::numeric`,
        updated_at: new Date(),
      })
      .where('id', '=', characterId)
      .returning('bank')
      .executeTakeFirstOrThrow();

    await trx.insertInto('bank_transactions').values({
      character_id: characterId,
      counterparty_id: null,
      kind: 'cash_deposit',
      amount,
      balance_after: updated.bank,
      description: 'Пополнение через банкомат/банк',
    }).execute();
  });
};

export const withdrawCash = async (characterId: number, amountInput: string): Promise<void> => {
  const amount = normalizeMoney(amountInput);
  await db().transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom('characters')
      .select('id')
      .where('id', '=', characterId)
      .where('deleted_at', 'is', null)
      .where(sql<boolean>`bank >= ${amount}::numeric`)
      .forUpdate()
      .executeTakeFirst();
    if (!row) throw new Error('INSUFFICIENT_FUNDS');

    const updated = await trx
      .updateTable('characters')
      .set({
        bank: sql<string>`bank - ${amount}::numeric`,
        cash: sql<string>`cash + ${amount}::numeric`,
        updated_at: new Date(),
      })
      .where('id', '=', characterId)
      .returning('bank')
      .executeTakeFirstOrThrow();

    await trx.insertInto('bank_transactions').values({
      character_id: characterId,
      counterparty_id: null,
      kind: 'cash_withdrawal',
      amount,
      balance_after: updated.bank,
      description: 'Снятие наличных',
    }).execute();
  });
};
