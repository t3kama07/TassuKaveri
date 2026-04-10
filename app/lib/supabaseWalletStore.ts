import { Transaction, Wallet } from '@/types/wallet';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;
type SupabaseWalletRow = {
  user_uid: string;
  balance: number;
  last_request_id: string | null;
  last_request_owner_id: string | null;
  daily_earned_date: string | null;
  daily_earned_credits: number | null;
  last_wallet_action: Wallet['lastWalletAction'] | null;
  created_at: string;
  updated_at: string;
};
type SupabaseWalletTransactionRow = {
  id: string;
  user_uid: string;
  tx_type: Transaction['type'];
  amount: number;
  reference: string;
  request_id: string | null;
  occurred_at: string;
  balance_after: number;
};

type WalletInput = Omit<Wallet, 'createdAt' | 'updatedAt'> & {
  createdAt?: DateInput;
  updatedAt?: DateInput;
};

type WalletTransactionInput = Omit<Transaction, 'timestamp'> & {
  timestamp?: DateInput;
};

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: DateInput, fallback = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return fallback;
}

function mapWalletToSupabaseRow(userId: string, wallet: WalletInput): Record<string, unknown> {
  const now = new Date();

  return {
    user_uid: userId,
    balance: asNumber(wallet.balance),
    last_request_id: wallet.lastRequestId ? asString(wallet.lastRequestId) : null,
    last_request_owner_id: wallet.lastRequestOwnerId ? asString(wallet.lastRequestOwnerId) : null,
    daily_earned_date: wallet.dailyEarnedDate ? asString(wallet.dailyEarnedDate) : null,
    daily_earned_credits:
      typeof wallet.dailyEarnedCredits === 'number' && Number.isFinite(wallet.dailyEarnedCredits)
        ? wallet.dailyEarnedCredits
        : null,
    last_wallet_action: wallet.lastWalletAction ? asString(wallet.lastWalletAction) : null,
    created_at: toIsoString(wallet.createdAt, now),
    updated_at: toIsoString(wallet.updatedAt, now),
  };
}

function mapTransactionToSupabaseRow(
  userId: string,
  transaction: WalletTransactionInput
): Record<string, unknown> {
  return {
    id: transaction.id,
    user_uid: userId,
    tx_type: asString(transaction.type),
    amount: asNumber(transaction.amount),
    reference: asString(transaction.reference),
    request_id: transaction.requestId ? asString(transaction.requestId) : null,
    occurred_at: toIsoString(transaction.timestamp, new Date()),
    balance_after: asNumber(transaction.balanceAfter),
  };
}

function mapSupabaseWalletRow(row: SupabaseWalletRow): Wallet {
  return {
    balance: typeof row.balance === 'number' ? row.balance : 0,
    lastRequestId: row.last_request_id || undefined,
    lastRequestOwnerId: row.last_request_owner_id || undefined,
    dailyEarnedDate: row.daily_earned_date || undefined,
    dailyEarnedCredits:
      typeof row.daily_earned_credits === 'number' ? row.daily_earned_credits : undefined,
    lastWalletAction: row.last_wallet_action || undefined,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function mapSupabaseWalletTransactionRow(row: SupabaseWalletTransactionRow): Transaction {
  return {
    id: row.id,
    type: row.tx_type,
    amount: typeof row.amount === 'number' ? row.amount : 0,
    reference: row.reference || '',
    requestId: row.request_id || undefined,
    timestamp: toDate(row.occurred_at),
    balanceAfter: typeof row.balance_after === 'number' ? row.balance_after : 0,
  };
}

export async function replaceWalletStateInSupabase(params: {
  userId: string;
  wallet: WalletInput;
  transactions: WalletTransactionInput[];
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { userId, wallet, transactions } = params;

  const { error: walletError } = await supabase
    .from('wallets')
    .upsert(mapWalletToSupabaseRow(userId, wallet), { onConflict: 'user_uid' });

  if (walletError) {
    throw new Error(`Failed to upsert wallet in Supabase: ${walletError.message}`);
  }

  const { error: deleteError } = await supabase
    .from('wallet_transactions')
    .delete()
    .eq('user_uid', userId);

  if (deleteError) {
    throw new Error(`Failed to replace wallet transactions in Supabase: ${deleteError.message}`);
  }

  if (!transactions.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from('wallet_transactions')
    .upsert(
      transactions.map((transaction) => mapTransactionToSupabaseRow(userId, transaction)),
      { onConflict: 'id' }
    );

  if (insertError) {
    throw new Error(`Failed to upsert wallet transactions in Supabase: ${insertError.message}`);
  }
}

export async function getWalletFromSupabase(userId: string): Promise<Wallet | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_uid', userId)
    .maybeSingle<SupabaseWalletRow>();

  if (error) {
    throw new Error(`Failed to read wallet from Supabase: ${error.message}`);
  }

  return data ? mapSupabaseWalletRow(data) : null;
}

export async function getWalletTransactionsFromSupabase(
  userId: string,
  maxResults?: number
): Promise<Transaction[]> {
  const supabase = createSupabaseAdminClient();
  let queryBuilder = supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_uid', userId)
    .order('occurred_at', { ascending: false });

  if (typeof maxResults === 'number' && Number.isFinite(maxResults) && maxResults > 0) {
    queryBuilder = queryBuilder.limit(maxResults);
  }

  const { data, error } = await queryBuilder.returns<SupabaseWalletTransactionRow[]>();
  if (error) {
    throw new Error(`Failed to read wallet transactions from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseWalletTransactionRow);
}
