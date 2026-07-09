'use client';

import PublicPageShell from '@/components/public/PublicPageShell';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, type CookieConsentValue } from '@/lib/cookieConsent';
import { useCookieConsent } from '@/lib/useCookieConsent';

function saveConsent(value: CookieConsentValue) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export default function CookiePreferencesPage() {
  const choice = useCookieConsent();

  function handleChoice(value: CookieConsentValue) {
    saveConsent(value);
  }

  return (
    <PublicPageShell
      eyebrow={{ en: 'Privacy', fi: 'Tietosuoja' }}
      title={{
        en: 'Cookie preferences',
        fi: 'Evasteasetukset',
      }}
      subtitle={{
        en: 'Choose whether TassuKaveri may use optional analytics. Necessary storage stays on because the site needs it to work.',
        fi: 'Valitse, saako TassuKaveri käyttää valinnaista analytiikkaa. Välttämätön tallennus pysyy käytössä, koska sivusto tarvitsee sitä toimiakseen.',
      }}
    >
      <section className="rounded-[24px] border border-[#dbe5f0] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff7a2d]">
          Current choice
        </p>
        <p className="mt-3 text-2xl font-bold text-[#0f2640]">
          {choice === 'accepted' ? 'Analytics accepted' : choice === 'declined' ? 'Analytics declined' : 'No choice saved'}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#516173]">
          Analytics helps us understand visits and improve TassuKaveri. We only load Google Analytics or Google Tag
          Manager after you accept optional analytics.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f]"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={() => handleChoice('declined')}
            className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#f8fafc]"
          >
            Decline analytics
          </button>
        </div>
      </section>
    </PublicPageShell>
  );
}
