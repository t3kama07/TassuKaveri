'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/public/PublicPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { blogArticles, blogIndexContent, localizeBlogArticle } from '@/lib/publicPagesContent';

export default function BlogIndexPage() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      eyebrow={blogIndexContent.eyebrow}
      title={blogIndexContent.title}
      subtitle={blogIndexContent.subtitle}
      actions={[
        {
          label: {
            en: 'Create an account',
            fi: 'Luo tili',
          },
          href: '/signup',
        },
      ]}
    >
      <div className="rounded-[24px] border border-[#dbe5f0] bg-[#0f2640] px-5 py-4 text-sm leading-7 text-[#dbe5f2] shadow-sm">
        {blogIndexContent.note[language]}
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {blogArticles.map((sourceArticle) => {
          const article = localizeBlogArticle(sourceArticle, language);
          return (
          <article
            key={article.slug}
            className="flex h-full flex-col rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#6b7280]">
              <span>{article.publishedAt}</span>
              <span aria-hidden="true">•</span>
              <span>{article.author}</span>
              <span aria-hidden="true">•</span>
              <span>{article.readTime}</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#0f2640]">
              <Link href={`/blog/${article.slug}`} className="hover:text-[#ff7a2d]">
                {article.title}
              </Link>
            </h2>

            <p className="mt-4 flex-1 text-base leading-8 text-[#516173]">{article.excerpt}</p>

            <div className="mt-6">
              <Link
                href={`/blog/${article.slug}`}
                className="inline-flex rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
              >
                {blogIndexContent.readMoreLabel[language]}
              </Link>
            </div>
          </article>
          );
        })}
      </section>
    </PublicPageShell>
  );
}
