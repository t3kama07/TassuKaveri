'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleResendVerification() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendVerificationEmail();
      setSuccess('Verification email sent. Please check your inbox.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to send verification email: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleIHaveVerified() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const verified = await refreshUser();
      if (verified) {
        router.push('/dashboard');
      } else {
        setError('Email is not verified yet. Please verify first.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to refresh verification status: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <ProtectedRoute>
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-4">Verify your email</h1>
        <p className="text-[#6b7280] mb-6">
          We sent a verification link to <span className="font-medium">{user?.email}</span>.
          You must verify before using the platform.
        </p>

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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleResendVerification}
            disabled={loading}
            className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
          >
            Resend Verification Email
          </button>
          <button
            onClick={handleIHaveVerified}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            I Have Verified
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Logout
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
