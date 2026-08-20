export interface BalanceView {
  cash: string;
  bank: string;
}

export interface BankTransactionView {
  id: string;
  kind: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  counterpartyId: number | null;
  createdAt: string;
}
