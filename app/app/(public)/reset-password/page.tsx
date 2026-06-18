'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuth();

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const code = searchParams.get('code');

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (active && !session) {
          setError('This reset link is invalid or expired. Please request a new password reset email.');
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError('We could not open this reset link. Please request a new password reset email. ' + message);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been updated. You can now log in with the new password.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not update your password right now. Please try again. ' + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <h1 className="mb-4 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">Choose a new password</h1>
      <p className="mb-8 text-[1.02rem] leading-7 text-[#6b7280]">
        Use at least 6 characters. After saving, you&apos;ll return to log in.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-base font-medium text-[#0f2640]">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            disabled={checkingSession || Boolean(success)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d] disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-[#0f2640]">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            disabled={checkingSession || Boolean(success)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d] disabled:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={checkingSession || loading || Boolean(success)}
          className="w-full rounded-lg bg-[#ff7a2d] px-4 py-3.5 text-[1.05rem] font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
        >
          {checkingSession ? 'Checking reset link...' : loading ? 'Saving password...' : 'Save new password'}
        </button>
      </form>

      <p className="mt-5 text-center text-[1.02rem] text-[#6b7280]">
        Need a fresh link?{' '}
        <Link href="/forgot-password" className="text-[#ff7a2d] hover:underline">
          Send reset email
        </Link>
      </p>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
          <h1 className="mb-4 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">
            Choose a new password
          </h1>
          <p className="text-[1.02rem] leading-7 text-[#6b7280]">Checking reset link...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
