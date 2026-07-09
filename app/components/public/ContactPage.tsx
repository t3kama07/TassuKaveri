'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const CONTACT_EMAIL = 'info@tassukaveri.fi';

const copy = {
  eyebrow: {
    en: 'Contact us',
    fi: 'Ota yhteytta',
  },
  title: {
    en: 'We are happy to hear from you.',
    fi: 'Kuulemme mielellamme sinusta.',
  },
  subtitle: {
    en: 'Questions about TassuKaveri, pet-care exchanges, credits, partnerships, or support? Send us a message and we will get back to you.',
    fi: 'Kysymyksia TassuKaverista, lemmikkihoitovaihdoista, krediiteista, kumppanuuksista tai tuesta? Laheta meille viesti, niin palaamme asiaan.',
  },
  emailLabel: {
    en: 'Email',
    fi: 'Sahkoposti',
  },
  responseLabel: {
    en: 'Response time',
    fi: 'Vastausaika',
  },
  responseText: {
    en: 'We aim to reply as soon as possible.',
    fi: 'Pyrimme vastaamaan mahdollisimman pian.',
  },
  supportTitle: {
    en: 'What can we help with?',
    fi: 'MissÃ¤ voimme auttaa?',
  },
  supportItems: [
    {
      en: 'Questions before joining TassuKaveri',
      fi: 'Kysymykset ennen TassuKaveriin liittymista',
    },
    {
      en: 'Help with pet-care requests or sitter profiles',
      fi: 'Apua lemmikkihoitopyyntoihin tai hoitajaprofiileihin',
    },
    {
      en: 'Feedback, safety concerns, or community suggestions',
      fi: 'Palaute, turvallisuushuomiot tai yhteisoehdotukset',
    },
  ],
  emailButton: {
    en: 'Email us',
    fi: 'Laheta sahkopostia',
  },
  signupButton: {
    en: 'Create an account',
    fi: 'Luo tili',
  },
} as const;

export default function ContactPage() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      actions={[
        {
          label: copy.emailButton,
          href: `mailto:${CONTACT_EMAIL}`,
        },
        {
          label: copy.signupButton,
          href: '/signup',
          variant: 'secondary',
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <section className="rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a2d]">
            {copy.emailLabel[language]}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 block break-words text-3xl font-bold text-[#0f2640] transition-colors hover:text-[#ff7a2d] sm:text-4xl"
          >
            {CONTACT_EMAIL}
          </a>
          <div className="mt-8 rounded-[22px] border border-[#f3d8c7] bg-[#fff7ef] p-5">
            <p className="text-sm font-semibold text-[#0f2640]">
              {copy.responseLabel[language]}
            </p>
            <p className="mt-2 text-base leading-7 text-[#516173]">
              {copy.responseText[language]}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-[#0f2640]">{copy.supportTitle[language]}</h2>
          <div className="mt-6 grid gap-3">
            {copy.supportItems.map((item) => (
              <div
                key={item.en}
                className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-base font-medium text-[#0f2640] shadow-sm"
              >
                {item[language]}
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
            >
              {copy.emailButton[language]}
            </a>
            <Link
              href="/faq.html"
              className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f8fafc]"
            >
              FAQ
            </Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
