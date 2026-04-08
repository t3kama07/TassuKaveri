'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#6b7280]">Loading...</div>
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
          <h1 className="text-2xl font-bold text-[#0f2640] mb-2">Account Frozen</h1>
          <p className="text-[#6b7280]">
            This account has been frozen by an administrator. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
