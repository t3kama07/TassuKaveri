'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

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
          setError(t(
            'This reset link is invalid or expired. Please request a new password reset email.',
            'Palautuslinkki on virheellinen tai vanhentunut. Pyydä uusi salasanan palautusviesti.'
          ));
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
          setError(t(
            'We could not open this reset link. Please request a new password reset email. ',
            'Palautuslinkkiä ei voitu avata. Pyydä uusi salasanan palautusviesti. '
          ) + message);
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
  }, [searchParams, t]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t('Passwords do not match.', 'Salasanat eivät täsmää.'));
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setSuccess(t(
        'Your password has been updated. You can now log in with the new password.',
        'Salasanasi on päivitetty. Voit nyt kirjautua uudella salasanalla.'
      ));
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t(
        'We could not update your password right now. Please try again. ',
        'Salasanaa ei voitu päivittää juuri nyt. Yritä uudelleen. '
      ) + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <h1 className="mb-4 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">
        {t('Choose a new password', 'Valitse uusi salasana')}
      </h1>
      <p className="mb-8 text-[1.02rem] leading-7 text-[#6b7280]">
        {t(
          "Use at least 6 characters. After saving, you'll return to log in.",
          'Käytä vähintään kuutta merkkiä. Tallennuksen jälkeen palaat kirjautumiseen.'
        )}
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
            {t('New password', 'Uusi salasana')}
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
            {t('Confirm new password', 'Vahvista uusi salasana')}
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
          {checkingSession
            ? t('Checking reset link...', 'Tarkistetaan palautuslinkkiä...')
            : loading
              ? t('Saving password...', 'Tallennetaan salasanaa...')
              : t('Save new password', 'Tallenna uusi salasana')}
        </button>
      </form>

      <p className="mt-5 text-center text-[1.02rem] text-[#6b7280]">
        {t('Need a fresh link?', 'Tarvitsetko uuden linkin?')}{' '}
        <Link href="/forgot-password" className="text-[#ff7a2d] hover:underline">
          {t('Send reset email', 'Lähetä palautusviesti')}
        </Link>
      </p>
    </main>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
          <h1 className="mb-4 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">
            {t('Choose a new password', 'Valitse uusi salasana')}
          </h1>
          <p className="text-[1.02rem] leading-7 text-[#6b7280]">
            {t('Checking reset link...', 'Tarkistetaan palautuslinkkiä...')}
          </p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
