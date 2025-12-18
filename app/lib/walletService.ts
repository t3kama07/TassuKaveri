import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Wallet, Transaction, CreateTransactionData } from '@/types/wallet';

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
 * Initialize a wallet for a new user with 0 balance
 */
export async function initializeWallet(userId: string): Promise<void> {
  const walletRef = getWalletRef(userId);
  
  // Check if wallet already exists
  const walletSnap = await getDoc(walletRef);
  if (walletSnap.exists()) {
    return; // Wallet already initialized
  }

  await setDoc(walletRef, {
    balance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
