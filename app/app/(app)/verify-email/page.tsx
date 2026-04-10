'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function VerifyEmailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-[#6b7280]">Redirecting to home...</p>
      </div>
    </ProtectedRoute>
  );
}
