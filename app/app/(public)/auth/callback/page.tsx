'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { mapSupabaseUserToAuthUser } from '@/lib/supabaseAuthClient';
import { profileExists } from '@/lib/profileService';
import { getLegalAcceptanceStatus } from '@/lib/legalAcceptanceService';
import { useLanguage } from '@/contexts/LanguageContext';
import { clearPendingGoogleSignupConsent } from '@/lib/googleSignupConsent';

function getOAuthError(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return query.get('error_description') ?? hash.get('error_description') ?? query.get('error');
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;

    async function finishGoogleLogin() {
      const oauthError = getOAuthError();
      if (oauthError) {
        clearPendingGoogleSignupConsent();
        setError(oauthError);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (sessionError) {
        clearPendingGoogleSignupConsent();
        setError(sessionError.message);
        return;
      }

      if (!data.session) {
        clearPendingGoogleSignupConsent();
        setError(
          t(
            'Google did not create a login session. Check the Google Client Secret in Supabase and try again.',
            'Google ei luonut kirjautumisistuntoa. Tarkista Googlen Client Secret Supabasessa ja yritä uudelleen.'
          )
        );
        return;
      }

      const intent =
        new URLSearchParams(window.location.search).get('intent') ||
        window.sessionStorage.getItem('tassukaveri_google_auth_intent');
      if (intent === 'login') {
        const authUser = mapSupabaseUserToAuthUser(data.session.user);
        const hasAccount = await profileExists(authUser.uid);
        const legalStatus = hasAccount
          ? await getLegalAcceptanceStatus(authUser.uid).catch(() => ({ accepted: false }))
          : { accepted: false };
        if (!active) {
          return;
        }

        if (!hasAccount || !legalStatus.accepted) {
          await supabase.auth.signOut().catch(() => undefined);
          window.sessionStorage.removeItem('tassukaveri_google_auth_intent');
          router.replace('/signup?from=google-login');
          return;
        }
      }

      window.sessionStorage.removeItem('tassukaveri_google_auth_intent');
      router.replace('/dashboard');
    }

    void finishGoogleLogin();
    return () => {
      active = false;
    };
  }, [router, t]);

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[#e7ebf0] bg-white p-6 shadow-sm">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-[#0f2640]">
              {t('Google login failed', 'Google-kirjautuminen epäonnistui')}
            </h1>
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block font-semibold text-[#ff7a2d] hover:underline"
            >
              {t('Return to login', 'Palaa kirjautumiseen')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#0f2640]">
              {t('Completing Google login', 'Viimeistellään Google-kirjautumista')}
            </h1>
            <p className="mt-3 text-[#6b7280]">
              {t('Please wait while we open your account.', 'Odota hetki, kun avaamme tilisi.')}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
