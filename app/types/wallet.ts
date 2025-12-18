export type TransactionType = 'earn' | 'spend';

export interface Wallet {
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  reference: string;
  timestamp: Date;
  balanceAfter: number;
}

export interface CreateTransactionData {
  type: TransactionType;
  amount: number;
  reference: string;
}
