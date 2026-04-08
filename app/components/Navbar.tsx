'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

function LanguageSwitcher({
  language,
  setLanguage,
  className = '',
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#dbe2ea] bg-white p-1 text-[0.8rem] font-semibold text-[#0f2640] shadow-[0_1px_0_rgba(15,38,64,0.02)] ${className}`}
    >
      {(['fi', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded-full px-3 py-1.5 transition-colors ${
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
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const publicNavCopy = publicContent[language].nav;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const unsubscribe = subscribeUnreadNotificationCount(user.uid, setUnreadNotifications);
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, user]);

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
    { href: '/dashboard', label: 'Home' },
    { href: '/exchange', label: 'Exchange' },
    { href: '/sitters', label: 'Sitters' },
    { href: '/pets', label: 'Pets' },
    { href: '/messages', label: 'Messages' },
    { href: '/profile', label: 'Profile' },
  ];

  const publicLinks = [
    { href: '/#how-it-works', label: publicNavCopy.howItWorks },
    { href: '/#trust-safety', label: publicNavCopy.safety },
    { href: '/about.html', label: publicNavCopy.about },
    { href: '/faq.html', label: publicNavCopy.faq },
    { href: '/blog.html', label: publicNavCopy.blog },
  ];

  return (
    <nav className="border-b border-[#e7ebf0] bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-14 2xl:px-20">
        <div className="flex min-h-[68px] items-center justify-between gap-4">
          <Link href={user ? '/dashboard' : '/'} className="flex h-[68px] items-center gap-2">
            <Image
              src="/logo.png"
              alt="TassuKaveri"
              width={132}
              height={44}
              className="h-9 w-auto sm:h-10"
            />
          </Link>

          <div className="hidden items-center justify-end gap-x-5 gap-y-3 py-3 text-[0.98rem] md:flex lg:gap-x-6">
            {user ? (
              <>
                {memberLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/notifications"
                  className="inline-flex items-center gap-2 font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                >
                  <span>Alerts</span>
                  {unreadNotifications > 0 && (
                    <span className="inline-flex min-w-[1.45rem] items-center justify-center rounded-full bg-[#ff7a2d] px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-[#ff7a2d] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {publicLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="font-semibold text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                  >
                    {item.label}
                  </Link>
                ))}
                <LanguageSwitcher language={language} setLanguage={setLanguage} />
                <Link
                  href="/login"
                  className="font-semibold text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
                >
                  {publicNavCopy.logIn}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-2xl bg-[#ff7a2d] px-6 py-3 font-semibold text-white shadow-[0_8px_20px_rgba(255,122,45,0.18)] transition-colors hover:bg-[#e66a1f]"
                >
                  {publicNavCopy.signUp}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {!user && mobileMenuOpen && (
              <LanguageSwitcher
                language={language}
                setLanguage={setLanguage}
                className="scale-[0.92] origin-right shadow-none"
              />
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navbar-menu"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
                    <span>Alerts</span>
                    {unreadNotifications > 0 && (
                      <span className="inline-flex min-w-[1.45rem] items-center justify-center rounded-full bg-[#ff7a2d] px-2 py-0.5 text-xs font-semibold text-white">
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
                      Admin
                    </Link>
                  )}
                  <div className="mt-3 rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-2xl bg-[#ff7a2d] px-5 py-3 text-left font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                    >
                      Logout
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
