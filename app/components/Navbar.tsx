'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { subscribeUnreadNotificationCount } from '@/lib/notificationService';
import { publicContent } from '@/lib/publicContent';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M15 17H9" />
      <path d="M18 10a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function LanguageSwitcher({
  language,
  setLanguage,
  className = '',
  compact = false,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#dbe2ea] bg-white font-semibold text-[#0f2640] shadow-[0_1px_0_rgba(15,38,64,0.02)] ${
        compact ? 'p-0.5 text-[0.68rem]' : 'p-1 text-[0.8rem]'
      } ${className}`}
    >
      {(['fi', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded-full transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} ${
            language === option
              ? 'bg-[#ff7a2d] text-white shadow-[0_6px_14px_rgba(255,122,45,0.22)]'
              : 'text-[#0f2640] hover:bg-[#fff2e9] hover:text-[#ff7a2d]'
          }`}
          aria-pressed={language === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [notificationSummary, setNotificationSummary] = useState({ userId: '', count: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const publicNavCopy = publicContent[language].nav;
  const isAdmin = profile?.role === 'admin';
  const unreadNotifications =
    user?.uid === notificationSummary.userId ? notificationSummary.count : 0;

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.uid;
    const unsubscribe = subscribeUnreadNotificationCount(userId, (count) => {
      setNotificationSummary({ userId, count });
    });
    return () => unsubscribe();
  }, [user]);

  async function handleLogout() {
    try {
      setMobileMenuOpen(false);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  const memberLinks = [
    { href: '/dashboard', label: t('Home', 'Etusivu') },
    { href: '/exchange', label: t('Exchange', 'Hoitovaihto') },
    { href: '/sitters', label: t('Sitters', 'Hoitajat') },
    { href: '/pets', label: t('Pets', 'Lemmikit') },
    { href: '/messages', label: t('Messages', 'Viestit') },
    { href: '/profile', label: t('Profile', 'Profiili') },
  ];

  const publicLinks = [
    { href: '/#how-it-works', label: publicNavCopy.howItWorks },
    {
      href: '/signup',
      label: publicContent[language].landing.hero.primaryCta,
    },
    {
      href: '/#earn-credits',
      label: language === 'en' ? 'Earn credits' : 'Ansaitse krediittejä',
    },
  ];

  return (
    <nav className="border-b border-[#e7ebf0] bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-14 2xl:px-20">
        <div className="flex min-h-[72px] items-center justify-between gap-4">
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex h-[72px] shrink-0 items-center gap-2"
          >
            <Image
              src="/images/favicon.png"
              alt="TassuKaveri"
              width={40}
              height={40}
              className="h-10 w-10 rounded-[0.95rem] object-cover sm:h-11 sm:w-11"
            />
            <span className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#0f2640] sm:text-[1.45rem]">
              TassuKaveri
            </span>
          </Link>

          {user ? (
            <div className="hidden flex-1 items-center justify-end gap-x-5 gap-y-3 py-3 text-[0.98rem] md:flex lg:gap-x-6">
              {memberLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                >
                  {item.label}
                </Link>
              ))}
              <LanguageSwitcher
                language={language}
                setLanguage={setLanguage}
                className="border-[#e2e8f0] bg-[#fbfcfe] p-[3px] text-[0.82rem] shadow-none"
              />
              <Link
                href="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? t(`${unreadNotifications} unread notifications`, `${unreadNotifications} lukematonta ilmoitusta`)
                    : t('Notifications', 'Ilmoitukset')
                }
                title={t('Notifications', 'Ilmoitukset')}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e3e9f0] bg-white text-[#0f2640] shadow-[0_4px_12px_rgba(15,38,64,0.05)] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
              >
                <BellIcon />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#ff7a2d] px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-white ring-2 ring-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                >
                  {t('Admin', 'Ylläpito')}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-2xl bg-[#ff7a2d] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                {t('Logout', 'Kirjaudu ulos')}
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:ml-auto md:flex md:items-center md:gap-8 lg:gap-10">
                <div className="flex items-center gap-8 py-3 text-[1.08rem] lg:gap-9">
                  {publicLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="font-semibold tracking-[-0.01em] text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="flex items-center gap-5 py-3">
                  <LanguageSwitcher
                    language={language}
                    setLanguage={setLanguage}
                    className="border-[#e2e8f0] bg-[#fbfcfe] p-[3px] text-[0.82rem] shadow-none"
                  />
                  <Link
                    href="/login"
                    className="px-2 text-[1.06rem] font-semibold text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                  >
                    {publicNavCopy.logIn}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-[1.2rem] bg-[#ff7a2d] px-6 py-3 text-[1.06rem] font-semibold text-white shadow-[0_8px_20px_rgba(255,122,45,0.18)] transition-colors hover:bg-[#e66a1f]"
                  >
                    {publicNavCopy.signUp}
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher
              language={language}
              setLanguage={setLanguage}
              compact
              className="shrink-0 shadow-none"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navbar-menu"
                aria-label={mobileMenuOpen ? t('Close menu', 'Sulje valikko') : t('Open menu', 'Avaa valikko')}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e9f0] bg-white text-[#0f2640] shadow-[0_4px_12px_rgba(15,38,64,0.06)] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
              >
                <MenuIcon open={mobileMenuOpen} />
                {user && unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-[#ff7a2d] px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navbar-menu" className="border-t border-[#e7ebf0] py-3 md:hidden">
            <div className="flex flex-col gap-1.5">
              {user ? (
                <>
                  {memberLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl px-3 py-2.5 text-[1.02rem] font-medium text-[#0f2640] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-between rounded-2xl px-3 py-2.5 text-[1.02rem] font-medium text-[#0f2640] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e9f0] bg-white text-[#0f2640]">
                        <BellIcon />
                        {unreadNotifications > 0 && (
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#ff7a2d] ring-2 ring-white" />
                        )}
                      </span>
                      {t('Notifications', 'Ilmoitukset')}
                    </span>
                    {unreadNotifications > 0 && (
                      <span className="text-sm font-semibold text-[#ff7a2d]">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl px-3 py-2.5 text-[1.02rem] font-medium text-[#0f2640] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
                    >
                      {t('Admin', 'Ylläpito')}
                    </Link>
                  )}
                  <div className="mt-3 rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-2xl bg-[#ff7a2d] px-5 py-3 text-left font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                    >
                      {t('Logout', 'Kirjaudu ulos')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {publicLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl px-3 py-2.5 text-[1.02rem] font-semibold text-[#0f2640] transition-colors hover:bg-[#fff7ef] hover:text-[#ff7a2d]"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="mt-3 rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] p-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-2xl px-3 py-2.5 text-center text-[1.02rem] font-semibold text-[#0f2640] transition-colors hover:bg-white hover:text-[#ff7a2d]"
                    >
                      {publicNavCopy.logIn}
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-2 block rounded-2xl bg-[#ff7a2d] px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                    >
                      {publicNavCopy.signUp}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
