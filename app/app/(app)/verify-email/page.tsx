'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-[#6b7280]">{t('Redirecting to home...', 'Siirrytään etusivulle...')}</p>
      </div>
    </ProtectedRoute>
  );
}
