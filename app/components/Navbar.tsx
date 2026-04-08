'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { subscribeUnreadNotificationCount } from '@/lib/notificationService';
import { publicContent } from '@/lib/publicContent';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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

  async function handleLogout() {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  return (
    <nav className="border-b border-[#e7ebf0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] items-center justify-between gap-8 px-6 sm:px-10 lg:px-14 2xl:px-20">
        <Link href={user ? '/dashboard' : '/'} className="flex h-[68px] items-center gap-2">
          <Image
            src="/logo.png"
            alt="TassuKaveri"
            width={132}
            height={44}
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 py-3 text-[0.98rem] sm:gap-x-6">
          {user ? (
            <>
              <Link href="/dashboard" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Home
              </Link>
              <Link href="/exchange" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Exchange
              </Link>
              <Link href="/sitters" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Sitters
              </Link>
              <Link href="/pets" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Pets
              </Link>
              <Link href="/messages" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Messages
              </Link>
              <Link href="/notifications" className="inline-flex items-center gap-2 font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                <span>Alerts</span>
                {unreadNotifications > 0 && (
                  <span className="inline-flex min-w-[1.45rem] items-center justify-center rounded-full bg-[#ff7a2d] px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
                Profile
              </Link>
              {isAdmin && (
                <Link href="/admin" className="font-medium text-[#0f2640] transition-colors hover:text-[#ff7a2d]">
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
              <Link
                href="/#how-it-works"
                className="font-semibold text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
              >
                {publicNavCopy.howItWorks}
              </Link>
              <Link
                href="/#trust-safety"
                className="font-semibold text-[#0f2640] transition-colors hover:text-[#ff7a2d]"
              >
                {publicNavCopy.safety}
              </Link>
              <div className="inline-flex items-center rounded-full border border-[#dbe2ea] bg-white p-1 text-[0.8rem] font-semibold text-[#0f2640] shadow-[0_1px_0_rgba(15,38,64,0.02)]">
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
      </div>
    </nav>
  );
}
