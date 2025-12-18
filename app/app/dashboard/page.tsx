'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getWallet, getRecentTransactions, addCredits, deductCredits } from '@/lib/walletService';
import { Wallet, Transaction } from '@/types/wallet';

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Test credit operations (for development)
  const [testAmount, setTestAmount] = useState(10);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [user]);

  async function loadWalletData() {
    if (!user) return;

    try {
      setLoading(true);
      const [walletData, txData] = await Promise.all([
        getWallet(user.uid),
        getRecentTransactions(user.uid, 10),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (err: any) {
      setError('Failed to load wallet: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCredits() {
    if (!user) return;
    setError('');
    setSuccess('');
    setProcessing(true);

    try {
      await addCredits(user.uid, testAmount, 'Test credit addition');
      setSuccess(`Added ${testAmount} credits successfully`);
      await loadWalletData();
    } catch (err: any) {
      setError('Failed to add credits: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeductCredits() {
    if (!user) return;
    setError('');
    setSuccess('');
    setProcessing(true);

    try {
      await deductCredits(user.uid, testAmount, 'Test credit deduction');
      setSuccess(`Deducted ${testAmount} credits successfully`);
      await loadWalletData();
    } catch (err: any) {
      setError('Failed to deduct credits: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Dashboard</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading wallet...</p>
          </div>
        ) : !wallet ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-red-700">Wallet not found. Please contact support.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Balance Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-[#0f2640] mb-2">Credit Balance</h2>
                <p className="text-4xl font-bold text-[#ff7a2d] mb-4">{wallet.balance}</p>
                <p className="text-sm text-[#6b7280]">
                  Last updated: {wallet.updatedAt.toLocaleDateString()}
                </p>

                {/* Test Operations (Development Only) */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-[#0f2640] mb-2">Test Operations</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(Number(e.target.value))}
                      min="1"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <span className="text-sm text-[#6b7280] py-1">credits</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCredits}
                      disabled={processing}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={handleDeductCredits}
                      disabled={processing}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Deduct
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-[#0f2640] mb-4">Recent Transactions</h2>
                {transactions.length === 0 ? (
                  <p className="text-[#6b7280]">No transactions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-[#0f2640]">{tx.reference}</p>
                          <p className="text-sm text-[#6b7280]">
                            {tx.timestamp.toLocaleDateString()} at{' '}
                            {tx.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              tx.type === 'earn' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.type === 'earn' ? '+' : '-'}
                            {tx.amount}
                          </p>
                          <p className="text-sm text-[#6b7280]">
                            Balance: {tx.balanceAfter}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
