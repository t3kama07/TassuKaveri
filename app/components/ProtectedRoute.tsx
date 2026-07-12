'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#6b7280]">{t('Loading...', 'Ladataan...')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (profile?.frozen) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h1 className="text-2xl font-bold text-[#0f2640] mb-2">
            {t('Account paused', 'Tili on jäädytetty')}
          </h1>
          <p className="text-[#6b7280]">
            {t(
              'You cannot use this account right now. Please contact support if you think this is a mistake.',
              'Et voi käyttää tätä tiliä tällä hetkellä. Ota yhteyttä tukeen, jos epäilet virhettä.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
