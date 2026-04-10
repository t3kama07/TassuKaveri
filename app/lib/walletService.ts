import { getTodayKey } from './platformPolicy';
import { Wallet, Transaction, CreditSummary } from '@/types/wallet';
import { mirrorWalletStateToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function generateTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapTransaction(
  id: string,
  data: Record<string, unknown>
): Transaction {
  const timestampValue = data.timestamp;
  const timestamp =
    timestampValue &&
    typeof timestampValue === 'object' &&
    'toDate' in timestampValue &&
    typeof timestampValue.toDate === 'function'
      ? timestampValue.toDate()
      : typeof timestampValue === 'string' || typeof timestampValue === 'number'
        ? new Date(timestampValue)
        : new Date();

  return {
    id,
    type: data.type as Transaction['type'],
    amount: typeof data.amount === 'number' ? data.amount : 0,
    reference: typeof data.reference === 'string' ? data.reference : '',
    requestId: typeof data.requestId === 'string' ? data.requestId : undefined,
    timestamp,
    balanceAfter: typeof data.balanceAfter === 'number' ? data.balanceAfter : 0,
  };
}

function buildWalletUpdate(
  wallet: Wallet,
  updates: Partial<Wallet>
): Wallet {
  return {
    ...wallet,
    ...updates,
    updatedAt: new Date(),
  };
}

function buildTransaction(params: {
  type: Transaction['type'];
  amount: number;
  reference: string;
  requestId?: string;
  balanceAfter: number;
}): Transaction {
  return {
    id: generateTransactionId(),
    type: params.type,
    amount: params.amount,
    reference: params.reference,
    requestId: params.requestId,
    timestamp: new Date(),
    balanceAfter: params.balanceAfter,
  };
}

async function saveWalletState(params: {
  actorId: string;
  userId: string;
  requestId?: string;
  wallet: Wallet;
  transactions: Transaction[];
}): Promise<void> {
  await mirrorWalletStateToSupabase(params);
}

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const payload = await fetchSupabaseReadJson<{ transactions: Array<Record<string, unknown>> }>(
    `/api/supabase-read/wallet?userId=${encodeURIComponent(userId)}&includeTransactions=true`,
    { requireAuth: true }
  );

  return payload.transactions.map((transaction) =>
    mapTransaction((transaction.id as string) || '', {
      timestamp: transaction.timestamp,
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference,
      requestId: transaction.requestId,
      balanceAfter: transaction.balanceAfter,
    })
  );
}

export async function syncWalletMirrorToSupabase(
  userId: string,
  actorId: string = userId,
  requestId?: string
): Promise<void> {
  const wallet = await getWallet(userId);
  if (!wallet) {
    return;
  }

  const transactions = await getAllTransactions(userId);
  await saveWalletState({
    actorId,
    userId,
    requestId,
    wallet,
    transactions,
  });
}

export async function initializeWallet(userId: string): Promise<void> {
  const existingWallet = await getWallet(userId);
  if (existingWallet) {
    return;
  }

  const starterBalance = 5;
  const wallet: Wallet = {
    balance: starterBalance,
    lastRequestId: '',
    lastRequestOwnerId: '',
    dailyEarnedDate: getTodayKey(),
    dailyEarnedCredits: 0,
    lastWalletAction: 'starter_bonus',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const transactions = [
    buildTransaction({
      type: 'starter_bonus',
      amount: starterBalance,
      reference: 'Starter bonus',
      balanceAfter: starterBalance,
    }),
  ];

  await saveWalletState({
    actorId: userId,
    userId,
    wallet,
    transactions,
  });
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const payload = await fetchSupabaseReadJson<{ wallet: Record<string, unknown> | null }>(
    `/api/supabase-read/wallet?userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  if (!payload.wallet) {
    return null;
  }

  const walletData = payload.wallet;
  return {
    balance: typeof walletData.balance === 'number' ? walletData.balance : 0,
    lastRequestId: (walletData.lastRequestId as string) || undefined,
    lastRequestOwnerId: (walletData.lastRequestOwnerId as string) || undefined,
    dailyEarnedDate: (walletData.dailyEarnedDate as string) || undefined,
    dailyEarnedCredits:
      typeof walletData.dailyEarnedCredits === 'number'
        ? walletData.dailyEarnedCredits
        : undefined,
    lastWalletAction: (walletData.lastWalletAction as Wallet['lastWalletAction']) || undefined,
    createdAt:
      typeof walletData.createdAt === 'string' || typeof walletData.createdAt === 'number'
        ? new Date(walletData.createdAt)
        : new Date(),
    updatedAt:
      typeof walletData.updatedAt === 'string' || typeof walletData.updatedAt === 'number'
        ? new Date(walletData.updatedAt)
        : new Date(),
  };
}

export async function addCredits(
  userId: string,
  amount: number,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWallet(userId);
  if (!wallet) {
    throw new Error('Wallet not found. Please initialize wallet first.');
  }

  const transactions = await getAllTransactions(userId);
  const newBalance = wallet.balance + amount;
  await saveWalletState({
    actorId: userId,
    userId,
    wallet: buildWalletUpdate(wallet, {
      balance: newBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'manual_earn',
    }),
    transactions: [
      buildTransaction({
        type: 'earn',
        amount,
        reference,
        balanceAfter: newBalance,
      }),
      ...transactions,
    ],
  });
}

export async function deductCredits(
  userId: string,
  amount: number,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWallet(userId);
  if (!wallet) {
    throw new Error('Wallet not found. Please initialize wallet first.');
  }

  if (wallet.balance < amount) {
    throw new Error(
      `Insufficient credits. You have ${wallet.balance} credits but need ${amount}.`
    );
  }

  const transactions = await getAllTransactions(userId);
  const newBalance = wallet.balance - amount;
  await saveWalletState({
    actorId: userId,
    userId,
    wallet: buildWalletUpdate(wallet, {
      balance: newBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'manual_spend',
    }),
    transactions: [
      buildTransaction({
        type: 'spend',
        amount,
        reference,
        balanceAfter: newBalance,
      }),
      ...transactions,
    ],
  });
}

export async function getRecentTransactions(
  userId: string,
  maxResults: number = 10
): Promise<Transaction[]> {
  const payload = await fetchSupabaseReadJson<{ transactions: Array<Record<string, unknown>> }>(
    `/api/supabase-read/wallet?userId=${encodeURIComponent(userId)}&includeTransactions=true&maxResults=${maxResults}`,
    { requireAuth: true }
  );

  return payload.transactions.map((transaction) =>
    mapTransaction((transaction.id as string) || '', {
      timestamp: transaction.timestamp,
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference,
      requestId: transaction.requestId,
      balanceAfter: transaction.balanceAfter,
    })
  );
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return wallet?.balance ?? 0;
}

export async function hasSufficientCredits(
  userId: string,
  amount: number
): Promise<boolean> {
  const balance = await getBalance(userId);
  return balance >= amount;
}

export async function escrowCredits(
  ownerId: string,
  amount: number,
  requestId: string,
  reference: string,
  actorId: string = ownerId
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWallet(ownerId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  if (wallet.balance < amount) {
    throw new Error(
      `Insufficient credits. You have ${wallet.balance} credits but need ${amount}.`
    );
  }

  const transactions = await getAllTransactions(ownerId);
  const newBalance = wallet.balance - amount;
  await saveWalletState({
    actorId,
    userId: ownerId,
    requestId,
    wallet: buildWalletUpdate(wallet, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_hold',
    }),
    transactions: [
      buildTransaction({
        type: 'escrow',
        amount,
        reference,
        requestId,
        balanceAfter: newBalance,
      }),
      ...transactions,
    ],
  });
}

export async function releaseEscrow(
  sitterId: string,
  amount: number,
  requestId: string,
  reference: string,
  actorId: string = sitterId
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWallet(sitterId);
  if (!wallet) {
    throw new Error('Sitter wallet not found');
  }

  const transactions = await getAllTransactions(sitterId);
  const newBalance = wallet.balance + amount;
  await saveWalletState({
    actorId,
    userId: sitterId,
    requestId,
    wallet: buildWalletUpdate(wallet, {
      balance: newBalance,
      dailyEarnedDate: getTodayKey(),
      dailyEarnedCredits: (wallet.dailyEarnedCredits ?? 0) + amount,
      lastRequestId: requestId,
      lastRequestOwnerId: '',
      lastWalletAction: 'escrow_release',
    }),
    transactions: [
      buildTransaction({
        type: 'escrow-release',
        amount,
        reference,
        requestId,
        balanceAfter: newBalance,
      }),
      ...transactions,
    ],
  });
}

export async function refundEscrow(
  ownerId: string,
  amount: number,
  requestId: string,
  reference: string,
  actorId: string = ownerId
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWallet(ownerId);
  if (!wallet) {
    throw new Error('Owner wallet not found');
  }

  const transactions = await getAllTransactions(ownerId);
  const newBalance = wallet.balance + amount;
  await saveWalletState({
    actorId,
    userId: ownerId,
    requestId,
    wallet: buildWalletUpdate(wallet, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_refund',
    }),
    transactions: [
      buildTransaction({
        type: 'escrow-refund',
        amount,
        reference,
        requestId,
        balanceAfter: newBalance,
      }),
      ...transactions,
    ],
  });
}

export async function getCreditSummary(userId: string): Promise<CreditSummary> {
  const wallet = await getWallet(userId);
  const transactions = await getAllTransactions(userId);

  let earned = 0;
  let spent = 0;

  transactions.forEach((transaction) => {
    const amount = transaction.amount;
    const type = transaction.type;

    if (
      type === 'earn' ||
      type === 'escrow-release' ||
      type === 'escrow-refund' ||
      type === 'starter_bonus'
    ) {
      earned += amount;
    }

    if (type === 'spend' || type === 'escrow') {
      spent += amount;
    }
  });

  return {
    balance: wallet?.balance ?? 0,
    earned,
    spent,
    transactionCount: transactions.length,
  };
}
