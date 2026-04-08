'use client';

import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { aboutPageContent } from '@/lib/publicPagesContent';

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      eyebrow={aboutPageContent.eyebrow}
      title={aboutPageContent.title}
      subtitle={aboutPageContent.subtitle}
      actions={[
        {
          label: aboutPageContent.ctaPrimary,
          href: '/#how-it-works',
        },
        {
          label: aboutPageContent.ctaSecondary,
          href: '/signup',
          variant: 'secondary',
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5 text-[1.05rem] leading-8 text-[#425466]">
            {aboutPageContent.intro.map((paragraph) => (
              <p key={paragraph.en}>{paragraph[language]}</p>
            ))}
          </div>
        </section>

        <aside className="grid gap-6">
          <section className="rounded-[28px] border border-[#dbe5f0] bg-[#0f2640] p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffb07d]">
              {aboutPageContent.missionTitle[language]}
            </p>
            <p className="mt-4 text-lg leading-8 text-[#dbe5f2]">
              {aboutPageContent.missionBody[language]}
            </p>
          </section>

          <section
            id="finland"
            className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)] p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-2xl font-bold text-[#0f2640]">
              {aboutPageContent.finlandTitle[language]}
            </h2>
            <p className="mt-4 text-base leading-8 text-[#516173]">
              {aboutPageContent.finlandBody[language]}
            </p>
          </section>
        </aside>
      </div>

      <section id="values" className="mt-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a2d]">
            {aboutPageContent.valuesTitle[language]}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0f2640]">
            {language === 'en'
              ? 'The principles behind every exchange'
              : 'Periaatteet jokaisen vaihdon taustalla'}
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {aboutPageContent.values.map((value) => (
            <article
              key={value.title.en}
              className="rounded-[26px] border border-[#dbe5f0] bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-[#0f2640]">{value.title[language]}</h3>
              <p className="mt-4 text-base leading-8 text-[#516173]">{value.body[language]}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
