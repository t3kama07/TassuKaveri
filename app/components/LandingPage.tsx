'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { publicContent } from '@/lib/publicContent';
import card1Image from '@/public/images/card1.webp';
import card2Image from '@/public/images/card2.webp';
import card3Image from '@/public/images/card3.webp';

type IconProps = {
  className?: string;
};

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

function ShieldIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M14.5 39.6c3.8-7.4 10.2-11.4 17.5-11.4s13.7 4 17.5 11.4c1.8 3.4-.7 7.4-4.6 7.4H19.1c-3.9 0-6.4-4-4.6-7.4Z"
        fill="#DFF7F0"
        stroke="#14314D"
        strokeWidth="2.8"
      />
      <path
        d="M19.5 30.5c0-9.5 5.6-15.3 12.5-15.3s12.5 5.8 12.5 15.3H19.5Z"
        fill="#FFB978"
        stroke="#14314D"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="m22.4 20.5-2.9-7.1 7 3.4M41.6 20.5l2.9-7.1-7 3.4"
        fill="#FFB978"
        stroke="#14314D"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <circle cx="27.2" cy="28.9" r="1.9" fill="#14314D" />
      <circle cx="36.8" cy="28.9" r="1.9" fill="#14314D" />
      <path d="M29.5 35c1.7 1.3 3.3 1.3 5 0" stroke="#14314D" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="47.8" cy="17.8" r="9.8" fill="#FF8A3D" stroke="#14314D" strokeWidth="2.6" />
      <path
        d="m43.6 17.6 2.8 2.8 5.8-6.1"
        stroke="#FFF8EF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M13.5 13h37c4.6 0 8.2 3.5 8.2 7.9v19.4c0 4.4-3.6 7.9-8.2 7.9H34.8L23.2 56v-7.8h-9.7c-4.6 0-8.2-3.5-8.2-7.9V20.9c0-4.4 3.6-7.9 8.2-7.9Z"
        fill="#DFF7F0"
        stroke="#14314D"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M21.2 34.3c0-8.8 5.1-14 11.3-14s11.3 5.2 11.3 14H21.2Z" fill="#9EDDCF" />
      <path
        d="m23.8 24.2-2.6-6.1 6.2 2.8M41.2 24.2l2.6-6.1-6.2 2.8"
        fill="#9EDDCF"
        stroke="#14314D"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="27.4" cy="31.3" r="1.8" fill="#14314D" />
      <circle cx="37.6" cy="31.3" r="1.8" fill="#14314D" />
      <path
        d="M29.6 37.2c1.8 1.6 4 1.6 5.8 0"
        stroke="#14314D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M48.5 27.6c2.7-3 7.3-1 7.3 2.8 0 4.2-7.3 8.3-7.3 8.3s-7.3-4.1-7.3-8.3c0-3.8 4.6-5.8 7.3-2.8Z"
        fill="#FF8A3D"
      />
    </svg>
  );
}

function StarIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="m32 8.5 6.8 13.8 15.3 2.2-11.1 10.8 2.6 15.2L32 43.3l-13.6 7.2L21 35.3 9.9 24.5l15.3-2.2L32 8.5Z"
        fill="#FFD16A"
        stroke="#14314D"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M27.1 34.6c2.1-3.3 7.7-3.3 9.8 0l.8 1.2c1.2 1.9-.2 4.3-2.4 4.3h-6.6c-2.2 0-3.6-2.4-2.4-4.3l.8-1.2Z"
        fill="#FF8A3D"
      />
      <circle cx="24.8" cy="29.5" r="2.4" fill="#FF8A3D" />
      <circle cx="39.2" cy="29.5" r="2.4" fill="#FF8A3D" />
      <circle cx="29.5" cy="25.6" r="2.4" fill="#FF8A3D" />
      <circle cx="34.5" cy="25.6" r="2.4" fill="#FF8A3D" />
      <path
        d="M14.5 12.5c1.2 3.1 1.9 3.8 5 5-3.1 1.2-3.8 1.9-5 5-1.2-3.1-1.9-3.8-5-5 3.1-1.2 3.8-1.9 5-5ZM49.5 42c1.2 3.1 1.9 3.8 5 5-3.1 1.2-3.8 1.9-5 5-1.2-3.1-1.9-3.8-5-5 3.1-1.2 3.8-1.9 5-5Z"
        fill="#7CC7B7"
      />
    </svg>
  );
}

function UsersIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M11.5 45.2c4.9-7 12.7-11 20.5-11s15.6 4 20.5 11c1.7 2.4.1 5.8-2.9 5.8H14.4c-3 0-4.6-3.4-2.9-5.8Z"
        fill="#FFF0E5"
        stroke="#14314D"
        strokeWidth="3"
      />
      <path
        d="M17.7 31.2c0-8.1 4.8-13.1 10.7-13.1s10.7 5 10.7 13.1H17.7Z"
        fill="#F6B66E"
      />
      <path
        d="m20.3 21.7-2.2-6 5.8 2.9M36.5 21.7l2.2-6-5.8 2.9"
        fill="#F6B66E"
        stroke="#14314D"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="29" r="1.7" fill="#14314D" />
      <circle cx="32.8" cy="29" r="1.7" fill="#14314D" />
      <path d="M26.4 34.3c1.4 1.1 2.8 1.1 4.2 0" stroke="#14314D" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M34.5 34.5c0-7.7 4.2-12.2 9.4-12.2s9.4 4.5 9.4 12.2H34.5Z"
        fill="#8CD6C8"
      />
      <path
        d="m36.7 26.1-1.9-5.3 5 2.6M51.1 26.1l1.9-5.3-5 2.6"
        fill="#8CD6C8"
        stroke="#14314D"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="40.2" cy="32" r="1.5" fill="#14314D" />
      <circle cx="47.6" cy="32" r="1.5" fill="#14314D" />
      <path d="M42.4 36.2c1.1.9 2.1.9 3.2 0" stroke="#14314D" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M11.2 20.7c1.1 2.8 1.8 3.5 4.6 4.6-2.8 1.1-3.5 1.8-4.6 4.6-1.1-2.8-1.8-3.5-4.6-4.6 2.8-1.1 3.5-1.8 4.6-4.6Z"
        fill="#FFD16A"
      />
    </svg>
  );
}

function LockIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18.5 28.5v-6.2C18.5 14.1 24.2 8 32 8s13.5 6.1 13.5 14.3v6.2"
        stroke="#14314D"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect
        x="12"
        y="26"
        width="40"
        height="30"
        rx="10"
        fill="#FFF2E7"
        stroke="#14314D"
        strokeWidth="3"
      />
      <path
        d="M27.5 42c2-3.2 7-3.2 9 0l.7 1.1c1.2 1.9-.2 4.4-2.5 4.4h-5.4c-2.3 0-3.7-2.5-2.5-4.4l.7-1.1Z"
        fill="#FF8A3D"
      />
      <circle cx="24.4" cy="36.3" r="2.6" fill="#FF8A3D" />
      <circle cx="39.6" cy="36.3" r="2.6" fill="#FF8A3D" />
      <circle cx="29.3" cy="33" r="2.6" fill="#FF8A3D" />
      <circle cx="34.7" cy="33" r="2.6" fill="#FF8A3D" />
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
        <span className="text-[#ff7a2d]">{copy.hero.titleAccent}.</span>
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
  const { user } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const copy = publicContent[language].landing;
  const safetyIcons = [ShieldIcon, MessageIcon, StarIcon, UsersIcon] as const;
  const howItWorksVisuals = [
    {
      src: card1Image,
      objectPosition: 'center',
    },
    {
      src: card2Image,
      objectPosition: 'center',
    },
    {
      src: card3Image,
      objectPosition: 'center',
    },
  ] as const;

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const safetyEyebrow =
    language === 'en'
      ? 'BUILT TO HELP YOU CHOOSE WITH CONFIDENCE'
      : 'LUOTTAMUS & TURVALLISUUS';
  const safetyHeading =
    language === 'en'
      ? 'Find the right pet care.'
      : 'Koska lemmikkisi turvallisuus tulee ensin.';
  const safetyHeadingAccent = language === 'en' ? 'Your way.' : '';
  const safetyBody =
    language === 'en'
      ? 'TassuKaveri connects pet owners and gives you the tools to make informed choices.'
      : copy.safety.body;
  const safetyFeatureTitles =
    language === 'en'
      ? [
          'Verified user profiles',
          'In-app messaging',
          'Reviews from pet owners',
          'Community guidelines',
        ]
      : copy.safety.features;
  const safetyFeatureDescriptions =
    language === 'en'
      ? [
          "Members verify their email and build public profiles, so you can make a more informed choice.",
          'Chat easily and securely within the platform before making any arrangements.',
          'See honest feedback from other pet owners to help you decide.',
          'We set clear guidelines and actively moderate to keep the community respectful.',
        ]
      : [
          'Käyttäjät vahvistavat sähköpostinsa ja rakentavat julkisen profiilin, jotta voit tehdä harkitumman valinnan.',
          'Keskustele turvallisesti sovelluksessa ja ilmoita helposti kaikesta, mikä tuntuu väärältä.',
          'Näe aidot arviot ja tähtiarviot muilta lemmikinomistajilta ennen kuin valitset hoitajan.',
          'Valvomme yhteisöä aktiivisesti, jotta TassuKaveri pysyy ystävällisenä ja turvallisena.',
        ];
  const safetyNote =
    language === 'en'
      ? 'TassuKaveri connects pet owners. Users are responsible for their own arrangements.'
      : 'Lemmikkisi ansaitsee parasta hoitoa. Me varmistamme sen.';
  const safetyTestimonialBody =
    language === 'en'
      ? 'We found a sitter quickly and had a great experience. Our dog was happy, and so were we.'
      : copy.safety.testimonialBody;
  const safetyTestimonialName =
    language === 'en'
      ? 'Matti K.'
      : copy.safety.testimonialAuthor.replace(/^-+\s*/, '').replace(/\s*,.*$/, '');
  const safetyTestimonialLocation =
    language === 'en' ? 'Helsinki, Finland' : 'Helsinki, Suomi';
  const safetyTestimonialLabel =
    language === 'en'
      ? ''
      : copy.safety.testimonialTitle.toUpperCase();

  return (
    <main className="bg-[#f4eee5] text-[#0f2640]">
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

          <div className="relative mt-14 grid gap-y-14 lg:grid-cols-3 lg:gap-x-8">
            {copy.howItWorks.cards.map(({ title, description }, index) => {
              const stepNumber = String(index + 1).padStart(2, '0');
              const cardTitle = title.replace(/^\d+\.\s*/, '');
              const visual = howItWorksVisuals[index % howItWorksVisuals.length];

              return (
                <article
                  key={title}
                  id={index === copy.howItWorks.cards.length - 1 ? 'earn-credits' : undefined}
                  className="group relative text-center transition-transform duration-300 hover:-translate-y-1"
                >
                  {index < copy.howItWorks.cards.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-[calc(100%-0.5rem)] top-[5.45rem] hidden w-20 items-center gap-2 text-[#bec8d4] lg:flex xl:w-24"
                    >
                      <div className="h-px flex-1 border-t-2 border-dashed border-current" />
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 7 5 5-5 5" />
                      </svg>
                    </div>
                  )}

                  <div className="relative mx-auto h-[11.5rem] w-[11.5rem] sm:h-[12rem] sm:w-[12rem]">
                    <div className="absolute left-0 top-1 z-[2] flex h-12 w-12 items-center justify-center rounded-full bg-[#fff2e9] text-[1.35rem] font-black tracking-[-0.05em] text-[#e7792f] shadow-[0_10px_22px_rgba(231,121,47,0.14)]">
                      {stepNumber}
                    </div>
                    <div className="absolute inset-x-3 bottom-2 top-2 overflow-hidden rounded-full border border-[#edf1f5] shadow-[0_18px_34px_rgba(15,38,64,0.09)] transition-transform duration-300 group-hover:scale-[1.02]">
                      <Image
                        src={visual.src}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18rem, 12rem"
                        className="object-cover"
                        style={{ objectPosition: visual.objectPosition }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center">
                    <h3 className="max-w-[16rem] text-balance text-[1.6rem] font-bold leading-[1.08] tracking-[-0.04em] text-[#16314f] sm:text-[1.72rem]">
                      {cardTitle}
                    </h3>
                    <p className="mt-5 max-w-[21rem] text-base leading-8 text-[#55687b]">
                      {description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

        </div>
      </section>

      <section id="trust-safety" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-start lg:px-8 xl:gap-16">
          <div>
            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.28em] text-[#ff7a2d]">
              {safetyEyebrow}
            </p>
            <h2 className="mt-5 max-w-[12ch] text-balance text-[3rem] font-black leading-[0.94] tracking-[-0.07em] text-[#16314f] sm:text-[3.8rem]">
              {language === 'en' ? (
                <>
                  <span>{safetyHeading}</span>
                  <span className="mt-1 block text-[#ff7a2d]">
                    {safetyHeadingAccent}
                  </span>
                </>
              ) : (
                safetyHeading
              )}
            </h2>
            <p className="mt-6 max-w-xl text-[1.08rem] leading-9 text-[#5b6c7d]">
              {safetyBody}
            </p>

            <ul className="mt-10 divide-y divide-[#e7edf3]">
              {safetyFeatureTitles.map((label, index) => {
                const Icon = safetyIcons[index];
                const description =
                  safetyFeatureDescriptions[index % safetyFeatureDescriptions.length];

                return (
                  <li
                    key={label}
                    className="flex gap-4 py-5 first:pt-0 last:pb-0 sm:gap-5"
                  >
                    <div className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-[#ffe0ce] bg-white shadow-[0_12px_26px_rgba(255,122,45,0.1)]">
                      <Icon className="h-12 w-12" />
                    </div>
                    <div className="pt-1">
                      <h3 className="text-[1.28rem] font-semibold tracking-[-0.03em] text-[#16314f]">
                        {label}
                      </h3>
                      <p className="mt-1 max-w-md text-[0.98rem] leading-7 text-[#627487]">
                        {description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 inline-flex max-w-xl items-center gap-3 rounded-[18px] border border-[#f4e4d8] bg-[#fff7f1] px-4 py-4 text-[#30475f] shadow-[0_12px_26px_rgba(255,122,45,0.08)] sm:px-5">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(255,122,45,0.12)]">
                <LockIcon className="h-8 w-8" />
              </span>
              <p className="text-sm font-medium leading-6 sm:text-[0.98rem]">
                {safetyNote}
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[28px] border border-[#edf1f5] bg-white shadow-[0_24px_60px_rgba(15,38,64,0.14)]">
              <div className="relative aspect-[4/4.95] w-full bg-[#f9fafb]">
                <Image
                  src="/images/middleimage.webp"
                  alt={copy.safety.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: 'center 30%' }}
                />
              </div>
            </div>

            <div className="mx-3 -mt-10 rounded-[24px] border border-[#eef2f6] bg-white p-5 shadow-[0_18px_40px_rgba(15,38,64,0.16)] sm:mx-0 sm:absolute sm:bottom-5 sm:right-[-1rem] sm:mt-0 sm:max-w-[23rem] sm:p-6">
              <QuoteIcon className="h-8 w-8 text-[#ffd0b4]" />
              <p className="mt-3 text-[1rem] leading-7 text-[#405466] sm:text-[1.02rem]">
                {safetyTestimonialBody}
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[#edf1f5]">
                  <Image
                    src="/images/middleimage.webp"
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                    style={{ objectPosition: 'center 18%' }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#16314f]">
                    {safetyTestimonialName}
                  </p>
                  <p className="text-xs text-[#7f90a1]">
                    {safetyTestimonialLocation}
                  </p>
                  {safetyTestimonialLabel ? (
                    <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#ff7a2d]">
                      {safetyTestimonialLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
