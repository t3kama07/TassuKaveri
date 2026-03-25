'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/lib/profileService';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingFreeze, setCheckingFreeze] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFreezeStatus() {
      if (!user) {
        if (active) {
          setIsFrozen(false);
          setCheckingFreeze(false);
        }
        return;
      }

      try {
        const profile = await getProfile(user.uid);
        if (active) {
          setIsFrozen(Boolean(profile?.frozen));
        }
      } catch {
        if (active) {
          setIsFrozen(false);
        }
      } finally {
        if (active) {
          setCheckingFreeze(false);
        }
      }
    }

    setCheckingFreeze(true);
    loadFreezeStatus();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || checkingFreeze) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#6b7280]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isFrozen) {
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
