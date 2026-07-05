'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

const POPUP_DELAY_MS = 3000;
const CLOSED_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const SUBSCRIBED_KEY = 'tassukaveri_email_popup_subscribed';
const CLOSED_UNTIL_KEY = 'tassukaveri_email_popup_closed_until';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HIDDEN_PATH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth'];

function shouldHideForPath(pathname: string): boolean {
  return HIDDEN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function EmailSubscriptionPopup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (shouldHideForPath(pathname)) {
      return;
    }

    const subscribed = window.localStorage.getItem(SUBSCRIBED_KEY) === 'true';
    const closedUntil = Number(window.localStorage.getItem(CLOSED_UNTIL_KEY) || 0);
    if (subscribed || closedUntil > Date.now()) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  function closePopup() {
    window.localStorage.setItem(CLOSED_UNTIL_KEY, String(Date.now() + CLOSED_FOR_MS));
    setVisible(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(nextEmail) || nextEmail.length > 254) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/email-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'We could not save your email right now.');
      }

      window.localStorage.setItem(SUBSCRIBED_KEY, 'true');
      window.localStorage.removeItem(CLOSED_UNTIL_KEY);
      setSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:bg-[#0f2640]/35 sm:p-6">
      <section
        className="relative w-full overflow-hidden rounded-[24px] border border-[#ead9ca] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_58%,#eef5ff_100%)] p-4 shadow-[0_18px_60px_rgba(15,38,64,0.22)] sm:max-w-[29rem] sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-popup-title"
      >
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e6d8ca] bg-white text-xl leading-none text-[#6b7280] transition-colors hover:bg-[#fff7ef] hover:text-[#0f2640]"
          aria-label="Close email signup popup"
        >
          &times;
        </button>

        <div className="flex gap-3 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff7a2d] text-xl text-white shadow-sm">
            🐾
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e96b2c]">
              TassuKaveri
            </p>
            <h2 id="email-popup-title" className="mt-1 text-lg font-bold leading-tight text-[#0f2640] sm:text-xl">
              Need pet care now or later?
            </h2>
            <p className="mt-2 text-sm leading-5 text-[#516173]">
              Get sitter updates and TassuKaveri details in your inbox.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-700">
              Thank you! We&rsquo;ll send you more details soon. 🐾
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="email-popup-address" className="block text-sm font-semibold text-[#0f2640]">
                Email address
              </label>
              <input
                id="email-popup-address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-[#d7e0ea] bg-white/90 px-4 py-2.5 text-sm text-[#0f2640] outline-none transition focus:border-[#ff7a2d] focus:ring-2 focus:ring-[#ff7a2d]/20"
                autoComplete="email"
              />
              {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#ff7a2d] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send me details'}
              </button>
              <Link
                href="/signup"
                className="rounded-full border border-[#cfd8e3] bg-white/90 px-5 py-2.5 text-center text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
              >
                Register now
              </Link>
            </div>
          </form>
        )}

        {submitted && (
          <div className="mt-4">
            <Link
              href="/signup"
              className="inline-flex rounded-full bg-[#ff7a2d] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f]"
            >
              Register now
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
