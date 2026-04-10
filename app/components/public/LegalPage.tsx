'use client';

import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LegalPageContent } from '@/lib/publicPagesContent';

export default function LegalPage({ content }: { content: LegalPageContent }) {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      eyebrow={content.eyebrow}
      title={content.title}
      subtitle={content.subtitle}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
        <section className="space-y-4">
          {content.sections.map((section) => (
            <article
              key={section.heading.en}
              className="rounded-[24px] border border-[#dbe5f0] bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-2xl font-bold text-[#0f2640]">
                {section.heading[language]}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-[#516173]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.en}>{paragraph[language]}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-[#dbe5f0] bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)] p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a2d]">
              {language === 'en' ? 'Last updated' : 'Päivitetty viimeksi'}
            </p>
            <p className="mt-3 text-2xl font-bold text-[#0f2640]">
              {content.updatedAt[language]}
            </p>
            <p className="mt-4 text-base leading-8 text-[#516173]">
              {language === 'en'
                ? 'We keep this page clear and practical so members understand the basics of privacy and platform rules.'
                : 'Pidämme tämän sivun selkeänä ja käytännöllisenä, jotta jäsenet ymmärtävät tietosuojan ja palvelun käytön perusteet.'}
            </p>
          </section>

          <section className="rounded-[24px] border border-[#dbe5f0] bg-[#0f2640] p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffb07d]">
              {language === 'en' ? 'Questions?' : 'Kysyttävää?'}
            </p>
            <p className="mt-4 text-base leading-8 text-[#dbe5f2]">
              {language === 'en'
                ? 'If you need help with your account, privacy questions, or community rules, you can reach us directly by email.'
                : 'Jos tarvitset apua tiliisi, tietosuojaan tai yhteisön sääntöihin liittyen, tavoitat meidät suoraan sähköpostilla.'}
            </p>
            <a
              href="mailto:info@tassukaveri.fi"
              className="mt-6 inline-flex text-base font-semibold text-white transition-colors hover:text-[#ffb07d]"
            >
              info@tassukaveri.fi
            </a>
          </section>
        </aside>
      </div>
    </PublicPageShell>
  );
}
