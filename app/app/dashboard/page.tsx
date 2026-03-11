'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getWallet, getRecentTransactions, getCreditSummary } from '@/lib/walletService';
import { Wallet, Transaction, CreditSummary } from '@/types/wallet';

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWalletData();
  }, [user]);

  async function loadWalletData() {
    if (!user) return;

    try {
      setLoading(true);
      const [walletData, txData, summaryData] = await Promise.all([
        getWallet(user.uid),
        getRecentTransactions(user.uid, 10),
        getCreditSummary(user.uid),
      ]);
      setWallet(walletData);
      setTransactions(txData);
      setSummary(summaryData);
    } catch (err: any) {
      setError('Failed to load wallet: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
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
                {summary && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-2 text-sm">
                    <p className="text-[#0f2640] font-medium">
                      Credits Earned: <span className="text-green-600">{summary.earned}</span>
                    </p>
                    <p className="text-[#0f2640] font-medium">
                      Credits Spent: <span className="text-red-600">{summary.spent}</span>
                    </p>
                    <p className="text-[#6b7280]">Transactions: {summary.transactionCount}</p>
                  </div>
                )}
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
                          {(() => {
                            const isIncoming =
                              tx.type === 'earn' ||
                              tx.type === 'starter_bonus' ||
                              tx.type === 'escrow-release' ||
                              tx.type === 'escrow-refund';
                            return (
                              <p className={`font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                                {isIncoming ? '+' : '-'}
                                {tx.amount}
                              </p>
                            );
                          })()}
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
