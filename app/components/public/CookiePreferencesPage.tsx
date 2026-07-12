'use client';

import PublicPageShell from '@/components/public/PublicPageShell';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, type CookieConsentValue } from '@/lib/cookieConsent';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { useLanguage } from '@/contexts/LanguageContext';

function saveConsent(value: CookieConsentValue) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export default function CookiePreferencesPage() {
  const choice = useCookieConsent();
  const { t } = useLanguage();

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
          {t('Current choice', 'Nykyinen valinta')}
        </p>
        <p className="mt-3 text-2xl font-bold text-[#0f2640]">
          {choice === 'accepted'
            ? t('Analytics accepted', 'Analytiikka hyväksytty')
            : choice === 'declined'
              ? t('Analytics declined', 'Analytiikka hylätty')
              : t('No choice saved', 'Valintaa ei ole tallennettu')}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#516173]">
          {t(
            'Analytics helps us understand visits and improve TassuKaveri. We only load Google Analytics or Google Tag Manager after you accept optional analytics.',
            'Analytiikka auttaa meitä ymmärtämään käyntejä ja parantamaan TassuKaveria. Lataamme Google Analyticsin tai Google Tag Managerin vasta, kun hyväksyt valinnaisen analytiikan.'
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#e66a1f]"
          >
            {t('Accept analytics', 'Hyväksy analytiikka')}
          </button>
          <button
            type="button"
            onClick={() => handleChoice('declined')}
            className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#f8fafc]"
          >
            {t('Decline analytics', 'Hylkää analytiikka')}
          </button>
        </div>
      </section>
    </PublicPageShell>
  );
}
