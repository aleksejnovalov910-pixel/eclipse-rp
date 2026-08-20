import type { BankTransactionView } from '@eclipse/shared';
import { db } from '../../infra/db';

export const listBankTransactions = async (
  characterId: number,
  limitInput = 50,
): Promise<BankTransactionView[]> => {
  const limit = Number.isInteger(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 50;
  const rows = await db()
    .selectFrom('bank_transactions')
    .select(['id', 'kind', 'amount', 'balance_after', 'description', 'counterparty_id', 'created_at'])
    .where('character_id', '=', characterId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit)
    .execute();

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    balanceAfter: row.balance_after,
    description: row.description,
    counterpartyId: row.counterparty_id,
    createdAt: row.created_at.toISOString(),
  }));
};
