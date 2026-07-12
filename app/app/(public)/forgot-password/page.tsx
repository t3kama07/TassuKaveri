'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendPasswordReset } = useAuth();
  const { t } = useLanguage();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const resetEmail = await sendPasswordReset(email);
      setSuccess(t(
        `Password reset email sent to ${resetEmail}. Open the link in that email to choose a new password.`,
        `Salasanan palautusviesti lähetettiin osoitteeseen ${resetEmail}. Avaa viestin linkki ja valitse uusi salasana.`
      ));
      setEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t(
        'We could not send the reset email right now. Please check the email address and try again. ',
        'Palautusviestiä ei voitu lähettää. Tarkista sähköpostiosoite ja yritä uudelleen. '
      ) + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <h1 className="mb-4 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">
        {t('Reset password', 'Palauta salasana')}
      </h1>
      <p className="mb-8 text-[1.02rem] leading-7 text-[#6b7280]">
        {t(
          "Enter your account email and we'll send a secure link for creating a new password.",
          'Anna tilisi sähköpostiosoite, niin lähetämme turvallisen linkin uuden salasanan luomiseen.'
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
            {t('Email', 'Sähköposti')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#ff7a2d] px-4 py-3.5 text-[1.05rem] font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
        >
          {loading ? t('Sending reset email...', 'Lähetetään palautusviestiä...') : t('Send reset email', 'Lähetä palautusviesti')}
        </button>
      </form>

      <p className="mt-5 text-center text-[1.02rem] text-[#6b7280]">
        {t('Remembered it?', 'Muistitko salasanan?')}{' '}
        <Link href="/login" className="text-[#ff7a2d] hover:underline">
          {t('Back to log in', 'Takaisin kirjautumiseen')}
        </Link>
      </p>
    </main>
  );
}
