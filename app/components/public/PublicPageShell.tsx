'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import type { LocalizedText } from '@/lib/publicPagesContent';

type ShellAction = {
  label: LocalizedText;
  href: string;
  variant?: 'primary' | 'secondary';
};

type PublicPageShellProps = {
  eyebrow?: LocalizedText;
  title: LocalizedText | string;
  subtitle: LocalizedText | string;
  actions?: ShellAction[];
  children: ReactNode;
};

function resolveText(value: LocalizedText | string, language: Language) {
  return typeof value === 'string' ? value : value[language];
}

export default function PublicPageShell({
  eyebrow,
  title,
  subtitle,
  actions = [],
  children,
}: PublicPageShellProps) {
  const { language } = useLanguage();

  return (
    <div className="bg-[#f8fafc] text-[#0f2640]">
      <section className="border-b border-[#e5ebf3] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            {eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff7a2d]">
                {resolveText(eyebrow, language)}
              </p>
            )}
            <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-[#0f2640] sm:text-5xl">
              {resolveText(title, language)}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#516173] sm:text-xl">
              {resolveText(subtitle, language)}
            </p>

            {actions.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {actions.map((action) => {
                  const isPrimary = action.variant !== 'secondary';
                  return (
                    <Link
                      key={`${action.href}-${action.label.en}`}
                      href={action.href}
                      className={
                        isPrimary
                          ? 'rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]'
                          : 'rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f8fafc]'
                      }
                    >
                      {action.label[language]}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">{children}</main>
    </div>
  );
}
