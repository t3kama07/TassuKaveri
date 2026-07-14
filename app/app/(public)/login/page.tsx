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
    <main className="min-h-[calc(100vh-72px)] bg-[linear-gradient(135deg,#fff7ef_0%,#f4eee5_48%,#eef5ff_100%)] px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-[30rem] overflow-hidden rounded-[28px] border border-[#ead9ca] bg-white/92 p-5 shadow-[0_22px_70px_rgba(15,38,64,0.14)] sm:p-7">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff7a2d] text-xl font-black text-white shadow-sm">
            T
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e96b2c]">
              TassuKaveri
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#0f2640]">
              {t('Log in', 'Kirjaudu')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#516173]">
              {t(
                'Continue to your pet-care requests, messages, and credits.',
                'Jatka hoitopyyntöihin, viesteihin ja krediitteihin.'
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <GoogleAuthButton
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        />

        <div className="my-5 flex items-center gap-4 text-sm text-[#6b7280]">
          <span className="h-px flex-1 bg-[#ead9ca]" />
          <span>{t('or use email', 'tai käytä sähköpostia')}</span>
          <span className="h-px flex-1 bg-[#ead9ca]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-bold text-[#0f2640]">
              {t('Email', 'Sähköposti')}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-4">
              <label htmlFor="login-password" className="text-sm font-bold text-[#0f2640]">
                {t('Password', 'Salasana')}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-[#ff7a2d] hover:underline"
              >
                {t('Forgot password?', 'Unohditko salasanan?')}
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#e66a1f] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? t('Logging in...', 'Kirjaudutaan...') : t('Log in', 'Kirjaudu')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#6b7280]">
          {t("Don't have an account?", 'Eikö sinulla ole tiliä?')}{' '}
          <Link href="/signup" className="font-bold text-[#ff7a2d] hover:underline">
            {t('Sign up', 'Rekisteröidy')}
          </Link>
        </p>
      </section>
    </main>
  );
}
