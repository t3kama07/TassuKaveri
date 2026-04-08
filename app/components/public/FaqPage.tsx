'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { faqPageContent } from '@/lib/publicPagesContent';

export default function FaqPage() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      eyebrow={faqPageContent.eyebrow}
      title={faqPageContent.title}
      subtitle={faqPageContent.subtitle}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="space-y-4">
          {faqPageContent.items.map((item, index) => (
            <details
              key={item.question.en}
              open={index === 0}
              className="rounded-[24px] border border-[#dbe5f0] bg-white p-6 shadow-sm"
            >
              <summary className="cursor-pointer list-none pr-8 text-lg font-semibold text-[#0f2640]">
                {item.question[language]}
              </summary>
              <p className="mt-4 text-base leading-8 text-[#516173]">{item.answer[language]}</p>
            </details>
          ))}
        </section>

        <aside className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)] p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a2d]">
            {language === 'en' ? 'Next step' : 'Seuraava askel'}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#0f2640]">
            {faqPageContent.ctaTitle[language]}
          </h2>
          <p className="mt-4 text-base leading-8 text-[#516173]">
            {faqPageContent.ctaBody[language]}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
            >
              {faqPageContent.ctaPrimary[language]}
            </Link>
            <Link
              href="/blog.html"
              className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f8fafc]"
            >
              {faqPageContent.ctaSecondary[language]}
            </Link>
          </div>

          <div className="mt-8 rounded-[22px] border border-dashed border-[#d7dee8] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[#0f2640]">
              {language === 'en' ? 'Need direct help?' : 'Tarvitsetko suoraa apua?'}
            </p>
            <p className="mt-2 text-sm leading-7 text-[#516173]">
              {language === 'en'
                ? 'You can always reach us at info@tassukaveri.fi if your question is not answered here yet.'
                : 'Voit aina ottaa yhteyttä osoitteeseen info@tassukaveri.fi, jos et löytänyt vastausta täältä.'}
            </p>
          </div>
        </aside>
      </div>
    </PublicPageShell>
  );
}
