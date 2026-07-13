'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { blogArticlePageContent, getBlogArticle } from '@/lib/publicPagesContent';

export default function BlogArticlePage({ slug }: { slug: string }) {
  const { language } = useLanguage();
  const article = getBlogArticle(slug, language);

  if (!article) {
    return (
      <PublicPageShell
        eyebrow={blogArticlePageContent.eyebrow}
        title={{
          en: 'Article not found',
          fi: 'Artikkelia ei löytynyt',
        }}
        subtitle={{
          en: 'The requested blog article is not available.',
          fi: 'Pyydettyä blogiartikkelia ei ole saatavilla.',
        }}
      >
        <div className="rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-sm">
          <Link
            href="/blog.html"
            className="text-sm font-semibold text-[#ff7a2d] transition-colors hover:text-[#e66a1f]"
          >
            {blogArticlePageContent.backLabel[language]}
          </Link>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      eyebrow={blogArticlePageContent.eyebrow}
      title={article.title}
      subtitle={article.description}
    >
      <article className="mx-auto max-w-4xl rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#6b7280]">
          <span>{article.publishedAt}</span>
          <span aria-hidden="true">•</span>
          <span>{article.author}</span>
          <span aria-hidden="true">•</span>
          <span>{article.readTime}</span>
        </div>

        <div className="mt-8 space-y-5 text-[1.05rem] leading-8 text-[#425466]">
          {article.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold tracking-tight text-[#0f2640]">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4 text-[1.02rem] leading-8 text-[#425466]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && (
                <ul className="mt-5 space-y-3 pl-5 text-[1.02rem] leading-8 text-[#425466]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-[24px] border border-[#dbe5f0] bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)] p-6">
          <h3 className="text-xl font-bold text-[#0f2640]">
            {blogArticlePageContent.ctaTitle[language]}
          </h3>
          <p className="mt-3 text-base leading-8 text-[#516173]">
            {blogArticlePageContent.ctaBody[language]}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
            >
              {blogArticlePageContent.ctaPrimary[language]}
            </Link>
            <Link
              href="/blog.html"
              className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f8fafc]"
            >
              {blogArticlePageContent.backLabel[language]}
            </Link>
          </div>
        </div>
      </article>
    </PublicPageShell>
  );
}
