import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Wallet, Transaction, CreditSummary } from '@/types/wallet';

const WALLET_DOC = 'main';

/**
 * Get wallet reference for a user
 */
function getWalletRef(userId: string) {
  return doc(db, 'users', userId, 'wallet', WALLET_DOC);
}

/**
 * Get transactions collection reference for a user (subcollection of wallet)
 */
function getTransactionsRef(userId: string) {
  return collection(db, 'users', userId, 'wallet', WALLET_DOC, 'transactions');
}

/**
 * Initialize a wallet for a new user with starter bonus.
 * Runs once per account creation.
 */
export async function initializeWallet(userId: string): Promise<void> {
  const walletRef = getWalletRef(userId);

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (walletSnap.exists()) {
      return;
    }

    const starterBalance = 3;
    const starterTxRef = doc(getTransactionsRef(userId));

    transaction.set(walletRef, {
      balance: starterBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'starter_bonus',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(starterTxRef, {
      type: 'starter_bonus',
      amount: starterBalance,
      reference: 'Starter bonus',
      timestamp: serverTimestamp(),
      balanceAfter: starterBalance,
    });
  });
}

/**
 * Get wallet balance and metadata
 */
export async function getWallet(userId: string): Promise<Wallet | null> {
  const walletRef = getWalletRef(userId);
  const walletSnap = await getDoc(walletRef);

  if (!walletSnap.exists()) {
    return null;
  }

  const data = walletSnap.data();
  return {
    balance: data.balance,
    lastRequestId: data.lastRequestId || undefined,
    lastRequestOwnerId: data.lastRequestOwnerId || undefined,
    lastWalletAction: data.lastWalletAction || undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Add credits to a user's wallet
 */
export async function addCredits(
  userId: string,
  amount: number,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const walletRef = getWalletRef(userId);
  const transactionsRef = getTransactionsRef(userId);

  // Use Firestore transaction for atomicity
  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    
    if (!walletSnap.exists()) {
      throw new Error('Wallet not found. Please initialize wallet first.');
    }

    const currentBalance = walletSnap.data().balance;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    transaction.update(walletRef, {
      balance: newBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'manual_earn',
      updatedAt: serverTimestamp(),
    });

    // Create transaction record
    const txRef = doc(transactionsRef);
    transaction.set(txRef, {
      type: 'earn',
      amount,
      reference,
      timestamp: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}

/**
 * Deduct credits from a user's wallet with balance validation
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const walletRef = getWalletRef(userId);
  const transactionsRef = getTransactionsRef(userId);

  // Use Firestore transaction for atomicity and balance checking
  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    
    if (!walletSnap.exists()) {
      throw new Error('Wallet not found. Please initialize wallet first.');
    }

    const currentBalance = walletSnap.data().balance;
    
    // CRITICAL: Prevent negative balance
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`
      );
    }

    const newBalance = currentBalance - amount;

    // Double check non-negative (defensive programming)
    if (newBalance < 0) {
      throw new Error('Transaction would result in negative balance');
    }

    // Update wallet balance
    transaction.update(walletRef, {
      balance: newBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'manual_spend',
      updatedAt: serverTimestamp(),
    });

    // Create transaction record
    const txRef = doc(transactionsRef);
    transaction.set(txRef, {
      type: 'spend',
      amount,
      reference,
      timestamp: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}

/**
 * Get recent transactions for a user
 */
export async function getRecentTransactions(
  userId: string,
  maxResults: number = 10
): Promise<Transaction[]> {
  const transactionsRef = getTransactionsRef(userId);
  const q = query(
    transactionsRef,
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );

  const querySnapshot = await getDocs(q);
  const transactions: Transaction[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    transactions.push({
      id: doc.id,
      type: data.type,
      amount: data.amount,
      reference: data.reference,
      requestId: data.requestId,
      timestamp: data.timestamp?.toDate() || new Date(),
      balanceAfter: data.balanceAfter,
    });
  });

  return transactions;
}

/**
 * Get wallet balance (convenience function)
 */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return wallet?.balance ?? 0;
}

/**
 * Check if user has sufficient credits
 */
export async function hasSufficientCredits(
  userId: string,
  amount: number
): Promise<boolean> {
  const balance = await getBalance(userId);
  return balance >= amount;
}

/**
 * Put credits into escrow (deduct from owner, not yet given to sitter)
 * Used when a request is accepted
 */
export async function escrowCredits(
  ownerId: string,
  amount: number,
  requestId: string,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const walletRef = getWalletRef(ownerId);
  const transactionsRef = getTransactionsRef(ownerId);

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    
    if (!walletSnap.exists()) {
      throw new Error('Wallet not found');
    }

    const currentBalance = walletSnap.data().balance;
    
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`
      );
    }

    const newBalance = currentBalance - amount;

    if (newBalance < 0) {
      throw new Error('Transaction would result in negative balance');
    }

    // Update wallet balance
    transaction.update(walletRef, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_hold',
      updatedAt: serverTimestamp(),
    });

    // Create escrow transaction record
    const txRef = doc(transactionsRef);
    transaction.set(txRef, {
      type: 'escrow',
      amount,
      reference,
      requestId,
      timestamp: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}

/**
 * Release escrowed credits to sitter wallet
 * Used when a request is completed
 */
export async function releaseEscrow(
  sitterId: string,
  amount: number,
  requestId: string,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const walletRef = getWalletRef(sitterId);
  const transactionsRef = getTransactionsRef(sitterId);

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    
    if (!walletSnap.exists()) {
      throw new Error('Sitter wallet not found');
    }

    const currentBalance = walletSnap.data().balance;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    transaction.update(walletRef, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: '',
      lastWalletAction: 'escrow_release',
      updatedAt: serverTimestamp(),
    });

    // Create escrow-release transaction record
    const txRef = doc(transactionsRef);
    transaction.set(txRef, {
      type: 'escrow-release',
      amount,
      reference,
      requestId,
      timestamp: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}

/**
 * Refund escrowed credits back to owner wallet
 * Used when an accepted request is cancelled
 */
export async function refundEscrow(
  ownerId: string,
  amount: number,
  requestId: string,
  reference: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const walletRef = getWalletRef(ownerId);
  const transactionsRef = getTransactionsRef(ownerId);

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    
    if (!walletSnap.exists()) {
      throw new Error('Owner wallet not found');
    }

    const currentBalance = walletSnap.data().balance;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    transaction.update(walletRef, {
      balance: newBalance,
      lastRequestId: requestId,
      lastRequestOwnerId: ownerId,
      lastWalletAction: 'escrow_refund',
      updatedAt: serverTimestamp(),
    });

    // Create escrow-refund transaction record
    const txRef = doc(transactionsRef);
    transaction.set(txRef, {
      type: 'escrow-refund',
      amount,
      reference,
      requestId,
      timestamp: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}

/**
 * Get credit summary totals for dashboard/reporting.
 * Incoming types count toward earned, outgoing types count toward spent.
 */
export async function getCreditSummary(userId: string): Promise<CreditSummary> {
  const wallet = await getWallet(userId);
  const transactionsRef = getTransactionsRef(userId);
  const snapshot = await getDocs(transactionsRef);

  let earned = 0;
  let spent = 0;

  snapshot.forEach((txDoc) => {
    const data = txDoc.data();
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    const type = data.type;

    if (type === 'earn' || type === 'escrow-release' || type === 'escrow-refund' || type === 'starter_bonus') {
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
    transactionCount: snapshot.size,
  };
}
