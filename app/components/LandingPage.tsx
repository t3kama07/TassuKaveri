'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import PublicFooter from '@/components/PublicFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { publicContent } from '@/lib/publicContent';

type IconProps = {
  className?: string;
};

function IconShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#ff7a2d] ${className}`}
    >
      {children}
    </div>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ProfileIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function SearchIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CreditIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7 12h10" />
      <path d="M12 9v6" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3 5.5 6v5c0 4.4 2.8 8.4 6.5 10 3.7-1.6 6.5-5.6 6.5-10V6L12 3Z" />
      <path d="m9.5 12 1.8 1.8L15 10.5" />
    </svg>
  );
}

function MessageIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 18.5c-2.2 0-4-1.7-4-3.9V8.4c0-2.2 1.8-3.9 4-3.9h10c2.2 0 4 1.7 4 3.9v6.2c0 2.2-1.8 3.9-4 3.9H12l-4.5 3v-3H7Z" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 13.5h4" />
    </svg>
  );
}

function StarIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

function FlagIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 21V5" />
      <path d="M5 5h9l1.5 2.5H20v7h-6.5L12 12H5" />
    </svg>
  );
}

function QuoteIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M10.5 7.5c-2.8 1.4-4.5 3.8-4.5 7v2h6.5v-6H9.2c.4-1.1 1.3-2.1 2.8-2.8l-1.5-2.2Zm8 0c-2.8 1.4-4.5 3.8-4.5 7v2h6.5v-6h-3.3c.4-1.1 1.3-2.1 2.8-2.8l-1.5-2.2Z" />
    </svg>
  );
}

function HeroContent({
  className = '',
  titleClassName = '',
  bodyClassName = '',
  trustClassName = '',
}: {
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  trustClassName?: string;
}) {
  const { language } = useLanguage();
  const copy = publicContent[language].landing;

  return (
    <div className={`flex flex-col items-start gap-4 text-left ${className}`}>
      <p className="text-[1rem] font-semibold uppercase tracking-[0.2em] text-[#ff7a2d] lg:text-[1.08rem] max-sm:text-[0.82rem] max-sm:tracking-[0.16em] sm:text-[1.05rem]">
        {copy.hero.eyebrow}
      </p>
      <h1
        className={`text-balance text-[3rem] font-extrabold tracking-tight text-[#0f2640] leading-[0.98] sm:text-[3.45rem] lg:text-[4rem] lg:leading-[0.97] max-sm:max-w-[19rem] max-sm:text-[2.35rem] max-sm:leading-[0.94] ${titleClassName}`}
      >
        {copy.hero.titleStart}{' '}
        <span className="text-[#ff7a2d]">{copy.hero.titleAccent}</span>.
      </h1>
      <p
        className={`text-[1.24rem] leading-9 text-[#4b5563] sm:text-[1.34rem] lg:text-[1.46rem] lg:leading-10 max-sm:max-w-[19rem] max-sm:text-[0.94rem] max-sm:leading-7 ${bodyClassName}`}
      >
        {copy.hero.body}
      </p>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
        <Link
          href="/signup"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ff7a2d] px-6 py-3 text-[1.08rem] font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#e66a1f] max-sm:min-h-11 max-sm:px-5 max-sm:text-[0.96rem]"
        >
          {copy.hero.primaryCta}
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-transparent px-6 py-3 text-[1.08rem] font-semibold text-[#0f2640] transition-colors hover:bg-[#f9fafb] max-sm:min-h-11 max-sm:border-[#d9e2ea] max-sm:bg-white/72 max-sm:px-5 max-sm:text-[0.96rem] max-sm:backdrop-blur-[2px]"
        >
          {copy.hero.secondaryCta}
        </Link>
      </div>

      <ul
        className={`flex flex-wrap items-center gap-x-6 gap-y-3 text-[1.02rem] font-medium text-[#1f2937] sm:text-[1.04rem] max-sm:gap-x-4 max-sm:gap-y-2 max-sm:text-[0.86rem] ${trustClassName}`}
      >
        {copy.trustItems.map((item) => (
          <li key={item} className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-flex h-4 w-4 items-center justify-center text-[#ff7a2d]">
              <CheckIcon className="h-4 w-4" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingPage() {
  const { language } = useLanguage();
  const copy = publicContent[language].landing;
  const howItWorksIcons = [ProfileIcon, SearchIcon, CreditIcon] as const;
  const safetyIcons = [ShieldIcon, MessageIcon, StarIcon, FlagIcon] as const;

  return (
    <div className="bg-white text-[#0f2640]">
      <section className="relative flex min-h-[480px] items-center overflow-hidden lg:min-h-[600px] max-sm:min-h-[640px]">
        <div className="absolute inset-0">
          <Image
            src="/images/heroimage.webp"
            alt={copy.hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center lg:object-[center_40%] max-sm:object-[72%_center]"
          />
        </div>

        <div
          className="absolute inset-0 z-[1] sm:hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.84) 22%, rgba(255,255,255,0.56) 58%, rgba(255,255,255,0.16) 100%), linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.80) 48%, rgba(255,255,255,0.18) 100%)',
          }}
        />

        <div
          className="absolute inset-0 z-[1] hidden sm:block"
          style={{
            background:
              'linear-gradient(to right, rgba(255,255,255,0.96) 14%, rgba(255,255,255,0.78) 32%, rgba(255,255,255,0.34) 50%, rgba(255,255,255,0.02) 70%)',
          }}
        />

        <HeroContent
          className="relative z-[2] w-full px-8 py-16 sm:px-12 lg:px-20 xl:px-24 2xl:px-28 max-sm:py-14"
          titleClassName="max-w-[840px]"
          bodyClassName="max-w-[690px]"
          trustClassName="max-w-[980px] md:flex-nowrap"
        />
      </section>

      <section id="how-it-works" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0f2640] sm:text-4xl">
              {copy.howItWorks.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#4b5563]">
              {copy.howItWorks.body}
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {copy.howItWorks.cards.map(({ title, description }, index) => {
              const Icon = howItWorksIcons[index];

              return (
                <article
                  key={title}
                  className="flex h-full flex-col rounded-xl border border-[#E5E7EB] p-6"
                >
                  <IconShell>
                    <Icon />
                  </IconShell>
                  <h3 className="mt-6 text-xl font-semibold text-[#0f2640]">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#4b5563]">
                    {description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="trust-safety" className="border-y border-[#E5E7EB] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0f2640] sm:text-4xl">
              {copy.safety.title}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#4b5563]">
              {copy.safety.body}
            </p>

            <ul className="mt-8 space-y-3">
              {copy.safety.features.map((label, index) => {
                const Icon = safetyIcons[index];

                return (
                  <li
                    key={label}
                    className="flex items-start gap-4 rounded-xl border border-[#E5E7EB] px-5 py-4"
                  >
                    <IconShell className="h-11 w-11 rounded-lg">
                      <Icon />
                    </IconShell>
                    <span className="pt-1 text-base leading-7 text-[#1f2937]">
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB]">
            <div className="relative aspect-[5/4] w-full bg-[#f9fafb]">
              <Image
                src="/images/middleimage.webp"
                alt={copy.safety.imageAlt}
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover"
              />
            </div>

            <div className="border-t border-[#E5E7EB] bg-white p-4 md:absolute md:bottom-4 md:right-4 md:max-w-sm md:rounded-2xl md:border md:backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <QuoteIcon className="h-8 w-8 text-[#d1d5db]" />
                <div>
                  <p className="text-xl font-semibold text-[#0f2640]">
                    {copy.safety.testimonialTitle}
                  </p>
                  <p className="mt-3 text-base leading-7 text-[#374151]">
                    {copy.safety.testimonialBody}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-[#0f2640]">
                    {copy.safety.testimonialAuthor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter copy={copy.footer} />
    </div>
  );
}
