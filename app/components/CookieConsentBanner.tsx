'use client';

import Link from 'next/link';
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  type CookieConsentValue,
} from '@/lib/cookieConsent';
import { useCookieConsent } from '@/lib/useCookieConsent';

function saveConsent(value: CookieConsentValue) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export default function CookieConsentBanner() {
  const consent = useCookieConsent();

  function handleChoice(value: CookieConsentValue) {
    saveConsent(value);
  }

  if (consent !== 'unset') {
    return null;
  }

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[45rem] rounded-[22px] border border-[#ead9ca] bg-white p-4 shadow-[0_18px_60px_rgba(15,38,64,0.22)] sm:bottom-5 sm:p-5"
      aria-label="Cookie consent"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[31rem]">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#e96b2c]">
            TassuKaveri privacy
          </p>
          <p className="mt-2 text-sm leading-6 text-[#516173]">
            We use necessary storage for the site to work. With your consent, we also use analytics to understand how
            visitors use TassuKaveri.
          </p>
          <Link
            href="/privacy-policy.html"
            className="mt-2 inline-flex text-sm font-semibold text-[#0f2640] underline decoration-[#ff7a2d]/60 underline-offset-4"
          >
            Read the privacy policy
          </Link>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => handleChoice('declined')}
            className="rounded-full border border-[#cfd8e3] bg-white px-4 py-2 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f]"
          >
            Accept
          </button>
        </div>
      </div>
    </section>
  );
}
