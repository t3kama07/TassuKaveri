export type TransactionType =
  | 'earn'
  | 'spend'
  | 'escrow'
  | 'escrow-release'
  | 'escrow-refund'
  | 'starter_bonus';

export interface Wallet {
  balance: number;
  lastRequestId?: string;
  lastRequestOwnerId?: string;
  lastWalletAction?:
    | 'starter_bonus'
    | 'manual_earn'
    | 'manual_spend'
    | 'escrow_hold'
    | 'escrow_release'
    | 'escrow_refund';
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  reference: string;
  requestId?: string; // Link to request for escrow transactions
  timestamp: Date;
  balanceAfter: number;
}

export interface CreateTransactionData {
  type: TransactionType;
  amount: number;
  reference: string;
  requestId?: string;
}

export interface CreditSummary {
  balance: number;
  earned: number;
  spent: number;
  transactionCount: number;
}
