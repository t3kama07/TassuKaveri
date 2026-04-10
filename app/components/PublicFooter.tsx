import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type FooterItem = {
  label: string;
  href?: string;
};

type FooterColumn = {
  title: string;
  items: readonly FooterItem[];
};

type SocialItem = {
  label: string;
  href: string;
  icon: 'facebook' | 'instagram' | 'mail';
};

type FooterContent = {
  brandDescription: string;
  email: string;
  socials: readonly SocialItem[];
  columns: readonly FooterColumn[];
  copyright: string;
};

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 21v-7h2.3l.5-3h-2.8V9.1c0-.8.4-1.6 1.7-1.6H16.5V5a15 15 0 0 0-2.2-.2c-2.3 0-3.8 1.4-3.8 4v2.2H8v3h2.5v7h3Z" />
    </svg>
  );
}

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
      <path d="M4 7h16v10H4z" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}

function SocialIcon({
  platform,
  className,
}: {
  platform: SocialItem['icon'];
  className?: string;
}) {
  const icons: Record<SocialItem['icon'], ReactNode> = {
    facebook: <FacebookIcon className={className} />,
    instagram: <InstagramIcon className={className} />,
    mail: <MailIcon className={className} />,
  };

  return icons[platform];
}

function FooterLink({ item }: { item: FooterItem }) {
  const className =
    'text-[0.98rem] text-[#dbe5f2]/82 transition-colors duration-200 hover:text-white sm:text-[1.04rem]';

  if (!item.href) {
    return <span className="text-[0.98rem] text-[#dbe5f2]/64 sm:text-[1.04rem]">{item.label}</span>;
  }

  if (item.href.startsWith('mailto:')) {
    return (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    );
  }

  if (item.href.startsWith('http')) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

export default function PublicFooter({ copy }: { copy: FooterContent }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[#1f3a5c] bg-[#122844] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(255,255,255,0.09), transparent 30%), radial-gradient(circle at 85% 18%, rgba(255,122,45,0.11), transparent 18%), linear-gradient(180deg, #1a3556 0%, #122844 52%, #10233a 100%)',
        }}
      />

      <div className="relative">
        <div className="mx-auto grid w-full max-w-[1600px] gap-x-10 gap-y-10 px-8 py-10 sm:grid-cols-2 sm:px-12 sm:py-12 lg:grid-cols-[minmax(360px,1.55fr)_repeat(3,minmax(180px,1fr))] lg:items-start lg:px-16 xl:gap-x-16 xl:px-20 2xl:px-24">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1.1rem] border border-white/14 bg-white/6 shadow-[0_10px_35px_rgba(0,0,0,0.16)]">
                <Image
                  src="/images/favicon.png"
                  alt="TassuKaveri"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-[0.7rem] object-cover"
                />
              </span>
              <div>
                <p className="text-[1.48rem] font-semibold tracking-tight text-white sm:text-[1.62rem]">
                  TassuKaveri
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-[390px] text-[1.04rem] leading-8 text-[#dbe5f2]/78">
              {copy.brandDescription}
            </p>

            <a
              href={`mailto:${copy.email}`}
              className="mt-6 inline-flex text-[1.02rem] font-semibold text-[#f4f7fb] transition-colors hover:text-[#ffb07d] sm:text-[1.08rem]"
            >
              {copy.email}
            </a>

            <div className="mt-5 flex items-center gap-2.5">
              {copy.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={social.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-[#f7fbff] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff7a2d]/60 hover:bg-[#ff7a2d]/12 hover:text-[#ffb07d]"
                >
                  <SocialIcon platform={social.icon} className="h-[0.95rem] w-[0.95rem]" />
                </a>
              ))}
            </div>
          </div>

          {copy.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[1.14rem] font-semibold tracking-tight text-white sm:text-[1.18rem]">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 bg-[#0d1e34]/78">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-center px-8 py-4 text-[0.96rem] text-[#b8c7da] sm:px-12 lg:px-16 xl:px-20 2xl:px-24">
            {copy.copyright.replace('{year}', year.toString())}
          </div>
        </div>
      </div>
    </footer>
  );
}
