'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import CitySelect from '@/components/CitySelect';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import { acceptLatestLegalDocuments } from '@/lib/legalAcceptanceService';
import {
  clearPendingGoogleSignupConsent,
  markPendingGoogleSignupConsent,
} from '@/lib/googleSignupConsent';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [cameFromGoogleLogin, setCameFromGoogleLogin] = useState(false);
  const { signup, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const legalAccepted = termsAccepted && privacyAccepted;
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCameFromGoogleLogin(params.get('from') === 'google-login');
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (password !== confirmPassword) {
      return setError(t('The passwords do not match.', 'Salasanat eivät täsmää.'));
    }
    if (!termsAccepted || !privacyAccepted) {
      return setError(t(
        'Please accept the Terms of Service and Privacy Policy before creating an account.',
        'Hyväksy käyttöehdot ja tietosuojaseloste ennen tilin luomista.'
      ));
    }

    setLoading(true);

    try {
      const result = await signup(email, password, {
        name: trimmedName,
        location: trimmedLocation,
      });
      if (result.user) {
        await acceptLatestLegalDocuments(result.user.uid);
      }
      if (result.requiresEmailVerification) {
        setSuccess(t(
          `Account created for ${result.email}. Check your email to confirm it, then log in.`,
          `Tili luotiin osoitteelle ${result.email}. Vahvista sähköposti viestissä olevasta linkistä ja kirjaudu sitten sisään.`
        ));
        setPassword('');
        setConfirmPassword('');
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t(
        'We could not create your account right now. Please check the fields and try again. ',
        'Tiliä ei voitu luoda juuri nyt. Tarkista tiedot ja yritä uudelleen. '
      ) + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError('');
    if (!termsAccepted || !privacyAccepted) {
      setError(t(
        'Please accept the Terms of Service and Privacy Policy before continuing with Google.',
        'Hyväksy käyttöehdot ja tietosuojaseloste ennen Google-rekisteröitymistä.'
      ));
      return;
    }
    setGoogleLoading(true);

    try {
      markPendingGoogleSignupConsent();
      await signInWithGoogle('signup');
    } catch (err: unknown) {
      clearPendingGoogleSignupConsent();
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(`${t('We could not start Google signup.', 'Google-rekisteröitymistä ei voitu aloittaa.')} ${message}`);
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
              {t('Create your account', 'Luo tili')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#516173]">
              {t(
                'Join the pet-care exchange. Add pets and sitter times after signup.',
                'Liity lemmikinhoitovaihtoon. Voit lisätä lemmikit ja hoitoajat rekisteröitymisen jälkeen.'
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {cameFromGoogleLogin && !error && !success && (
          <div className="mb-4 rounded-2xl border border-[#ead9ca] bg-[#fffaf6] px-4 py-3 text-sm text-[#7a4a1f]">
            {t('Please register first before using Google login.', 'Rekisteröidy ensin ennen Google-kirjautumista.')}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p>{success}</p>
            <p className="mt-2">
              {t('You can return to', 'Voit palata')}{' '}
              <Link href="/login" className="font-bold text-green-900 underline">
                {t('login', 'kirjautumiseen')}
              </Link>{' '}
              {t('after confirming the email.', 'sähköpostin vahvistamisen jälkeen.')}
            </p>
          </div>
        )}

        {!success && (
          <>
            <GoogleAuthButton
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
            />

            <div className="my-5 flex items-center gap-4 text-sm text-[#6b7280]">
              <span className="h-px flex-1 bg-[#ead9ca]" />
              <span>{t('or use email', 'tai käytä sähköpostia')}</span>
              <span className="h-px flex-1 bg-[#ead9ca]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="signup-name" className="mb-1 block text-sm font-bold text-[#0f2640]">
                  {t('Name', 'Nimi')}
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder={t('Your name', 'Nimesi')}
                  className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                />
              </div>

              <div>
                <label htmlFor="signup-city" className="mb-1 block text-sm font-bold text-[#0f2640]">
                  {t('City', 'Kaupunki')}
                </label>
                <CitySelect
                  id="signup-city"
                  value={location}
                  onChange={setLocation}
                  required
                  className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-1 block text-sm font-bold text-[#0f2640]">
                  {t('Email', 'Sähköposti')}
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                />
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="signup-password" className="mb-1 block text-sm font-bold text-[#0f2640]">
                    {t('Password', 'Salasana')}
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-bold text-[#0f2640]">
                    {t('Confirm', 'Vahvista')}
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[#d7e0ea] bg-white px-4 py-3 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead9ca] bg-[#fffaf6] p-4 text-sm text-[#516173]">
                <p className="mb-3 font-bold text-[#0f2640]">
                  {t('Before creating your account', 'Ennen tilin luomista')}
                </p>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#ff7a2d]"
                  />
                  <span>
                    {t('I accept the', 'Hyväksyn')}{' '}
                    <Link href="/terms-of-service.html" className="font-bold text-[#0f2640] underline">
                      {t('Terms of Service', 'käyttöehdot')}
                    </Link>
                    .
                  </span>
                </label>
                <label className="mt-2 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(event) => setPrivacyAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#ff7a2d]"
                  />
                  <span>
                    {t('I accept the', 'Hyväksyn')}{' '}
                    <Link href="/privacy-policy.html" className="font-bold text-[#0f2640] underline">
                      {t('Privacy Policy', 'tietosuojaselosteen')}
                    </Link>
                    .
                  </span>
                </label>
                {!legalAccepted && (
                  <p className="mt-3 text-xs font-semibold text-[#9a5a22]">
                    {t(
                      'Required for email signup and Google signup.',
                      'Pakollinen sähköposti- ja Google-rekisteröitymisessä.'
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !legalAccepted}
                className="w-full rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#e66a1f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? t('Creating account...', 'Luodaan tiliä...') : t('Create account', 'Luo tili')}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-sm text-[#6b7280]">
          {t('Already have an account?', 'Onko sinulla jo tili?')}{' '}
          <Link href="/login" className="font-bold text-[#ff7a2d] hover:underline">
            {t('Log in', 'Kirjaudu')}
          </Link>
        </p>
      </section>
    </main>
  );
}
