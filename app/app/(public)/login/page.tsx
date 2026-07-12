'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GoogleAuthButton from '@/components/GoogleAuthButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t(
        'We could not log you in. Please check your email and password, then try again. ',
        'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana ja yritä uudelleen. '
      ) + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(`${t('We could not start Google login.', 'Google-kirjautumista ei voitu aloittaa.')} ${message}`);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <h1 className="mb-2 text-4xl font-bold text-[#0f2640] sm:text-[2.75rem]">
        {t('Log in', 'Kirjaudu')}
      </h1>
      <p className="mb-8 text-[#6b7280]">
        {t('Continue to your pet-care requests, messages, and credits.', 'Jatka hoitopyyntöihin, viesteihin ja krediitteihin.')}
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <GoogleAuthButton
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading}
      />

      <div className="my-6 flex items-center gap-4 text-sm text-[#6b7280]">
        <span className="h-px flex-1 bg-gray-200" />
        <span>{t('or use email', 'tai käytä sähköpostia')}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-base font-medium text-[#0f2640]">
            {t('Email', 'Sähköposti')}
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-base font-medium text-[#0f2640]">
            {t('Password', 'Salasana')}
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#ff7a2d] px-4 py-3.5 text-[1.05rem] font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
        >
          {loading ? t('Logging in...', 'Kirjaudutaan...') : t('Log in', 'Kirjaudu')}
        </button>
      </form>

      <p className="mt-5 text-center text-[1.02rem] text-[#6b7280]">
        <Link href="/forgot-password" className="text-[#ff7a2d] hover:underline">
          {t('Forgot password?', 'Unohditko salasanan?')}
        </Link>
      </p>

      <p className="mt-2 text-center text-[1.02rem] text-[#6b7280]">
        {t("Don't have an account?", 'Eikö sinulla ole tiliä?')}{' '}
        <Link href="/signup" className="text-[#ff7a2d] hover:underline">
          {t('Sign up', 'Rekisteröidy')}
        </Link>
      </p>
    </main>
  );
}
