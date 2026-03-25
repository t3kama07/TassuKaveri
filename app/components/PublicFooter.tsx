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

function BrandPinIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

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
    'text-sm text-[#dbe5f2]/78 transition-colors duration-200 hover:text-white sm:text-[0.95rem]';

  if (!item.href) {
    return <span className="text-sm text-[#dbe5f2]/60 sm:text-[0.95rem]">{item.label}</span>;
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
        <div className="mx-auto grid w-full max-w-[1600px] gap-x-10 gap-y-10 px-6 py-12 sm:grid-cols-2 sm:px-10 sm:py-14 lg:grid-cols-[minmax(320px,1.2fr)_repeat(4,minmax(140px,1fr))] lg:items-start lg:px-14 xl:gap-x-14 2xl:px-20">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1.1rem] border border-white/14 bg-white/6 text-[#ff7a2d] shadow-[0_10px_35px_rgba(0,0,0,0.16)]">
                <BrandPinIcon />
              </span>
              <div>
                <p className="text-[1.4rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">
                  TassuKaveri
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-[350px] text-[0.98rem] leading-7 text-[#dbe5f2]/76">
              {copy.brandDescription}
            </p>

            <a
              href={`mailto:${copy.email}`}
              className="mt-7 inline-flex text-sm font-semibold text-[#f4f7fb] transition-colors hover:text-[#ffb07d] sm:text-[0.98rem]"
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
              <h2 className="text-[1.12rem] font-semibold tracking-tight text-white">
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
          <div className="mx-auto w-full max-w-[1600px] px-6 py-3 text-center text-sm text-[#b8c7da] sm:px-10 lg:px-14 2xl:px-20">
            {copy.copyright.replace('{year}', year.toString())}
          </div>
        </div>
      </div>
    </footer>
  );
}
