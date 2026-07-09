'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { acceptLatestLegalDocuments, getLegalAcceptanceStatus } from '@/lib/legalAcceptanceService';

export default function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function checkStatus() {
      if (loading) {
        return;
      }

      if (!user) {
        if (active) {
          setAccepted(true);
          setChecking(false);
        }
        return;
      }

      try {
        setChecking(true);
        const status = await getLegalAcceptanceStatus(user.uid);
        if (!status.accepted && window.sessionStorage.getItem('tassukaveri_google_auth_intent') === 'login') {
          window.sessionStorage.removeItem('tassukaveri_google_auth_intent');
          await logout();
          router.replace('/signup?from=google-login');
          return;
        }

        if (active) {
          setAccepted(status.accepted);
          setTermsAccepted(false);
          setPrivacyAccepted(false);
        }
      } catch (statusError) {
        console.error('Failed to check legal acceptance:', statusError);
        if (window.sessionStorage.getItem('tassukaveri_google_auth_intent') === 'login') {
          window.sessionStorage.removeItem('tassukaveri_google_auth_intent');
          await logout();
          router.replace('/signup?from=google-login');
          return;
        }

        if (active) {
          setAccepted(false);
          setError('We could not check your legal acceptance status. Please try again.');
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkStatus();

    return () => {
      active = false;
    };
  }, [loading, logout, router, user]);

  async function handleAccept() {
    if (!user || !termsAccepted || !privacyAccepted) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await acceptLatestLegalDocuments(user.uid);
      setAccepted(true);
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : 'Please try again.';
      setError('We could not save your acceptance right now. ' + message);
    } finally {
      setSubmitting(false);
    }
  }

  if (checking || accepted) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f4eee5] px-4 py-8">
      <section className="w-full max-w-[42rem] rounded-[24px] border border-[#ded3c2] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e96b2c]">
          TassuKaveri
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f2640]">
          Accept updated documents
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#516173]">
          TassuKaveri is a connection platform. Pet-care arrangements are made directly between
          pet owners and pet carers. Please accept the current Terms and Privacy Policy before
          continuing.
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e3d7c7] bg-[#fcfbf8] p-4 text-sm text-[#516173]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              I accept the{' '}
              <Link href="/terms-of-service.html" className="font-bold text-[#0f2640] underline">
                Terms of Service
              </Link>
              .
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e3d7c7] bg-[#fcfbf8] p-4 text-sm text-[#516173]">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              I accept the{' '}
              <Link href="/privacy-policy.html" className="font-bold text-[#0f2640] underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={!termsAccepted || !privacyAccepted || submitting}
          className="mt-5 rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Accept and continue'}
        </button>
      </section>
    </main>
  );
}
