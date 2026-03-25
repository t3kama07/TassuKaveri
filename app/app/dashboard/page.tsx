'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/lib/profileService';
import {
  getAllOpenRequests,
  getSitterRequests,
  getUserRequests,
} from '@/lib/requestService';
import { getAvailableSitters, NearbySitter } from '@/lib/sitterService';
import { getWallet } from '@/lib/walletService';
import { UserProfile } from '@/types/profile';
import { Request } from '@/types/request';
import { Wallet } from '@/types/wallet';

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(startDate: Date, endDate: Date): string {
  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function getPreviewRequests(requests: Request[], profile: UserProfile | null): Request[] {
  if (!profile?.location.trim()) {
    return requests.slice(0, 3);
  }

  const normalizedLocation = profile.location.trim().toLowerCase();
  const nearbyRequests = requests.filter((request) =>
    request.location.toLowerCase().includes(normalizedLocation)
  );

  return (nearbyRequests.length > 0 ? nearbyRequests : requests).slice(0, 3);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [openItems, setOpenItems] = useState(0);
  const [nearbySitters, setNearbySitters] = useState<NearbySitter[]>([]);
  const [communityRequests, setCommunityRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      if (!user) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError('');
        }

        const userProfile = await getProfile(user.uid);
        const [userWallet, userRequests, userSits, sitters, openRequests] = await Promise.all([
          getWallet(user.uid),
          getUserRequests(user.uid),
          getSitterRequests(user.uid),
          getAvailableSitters({
            excludeUserId: user.uid,
            city: userProfile?.location || '',
            latitude: userProfile?.latitude,
            longitude: userProfile?.longitude,
            maxDistanceKm: 15,
          }),
          getAllOpenRequests(user.uid),
        ]);

        if (!active) {
          return;
        }

        const activeOwnerRequests = userRequests.filter((request) =>
          ['open', 'accepted', 'awaiting_confirmation'].includes(request.status)
        );
        const activeSits = userSits.filter((request) =>
          ['accepted', 'awaiting_confirmation'].includes(request.status)
        );

        setProfile(userProfile);
        setWallet(
          userWallet ?? {
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        );
        setOpenItems(activeOwnerRequests.length + activeSits.length);
        setNearbySitters(sitters.slice(0, 3));
        setCommunityRequests(getPreviewRequests(openRequests, userProfile));
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError('Failed to load home: ' + message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      active = false;
    };
  }, [user]);

  const welcomeName = profile?.name.trim() || user?.email?.split('@')[0] || 'there';

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                Home
              </p>
              <h1 className="mt-3 text-3xl font-bold text-[#0f2640] sm:text-4xl">
                Welcome back, {welcomeName}
              </h1>
              <p className="mt-3 max-w-2xl text-[#516173]">
                Discover nearby sitters and current community requests in one clean place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/exchange"
                  className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                >
                  Open Exchange
                </Link>
                <Link
                  href="/sitters"
                  className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
                >
                  Find Sitters
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-sm text-[#6b7280]">Credits</p>
                <p className="mt-2 text-3xl font-bold text-[#0f2640]">{wallet?.balance ?? 0}</p>
                <p className="mt-1 text-sm text-[#6b7280]">Ready for your next exchange</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-sm text-[#6b7280]">Upcoming Sits</p>
                <p className="mt-2 text-3xl font-bold text-[#0f2640]">{openItems}</p>
                <p className="mt-1 text-sm text-[#6b7280]">Accepted or upcoming sitter jobs</p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-[#6b7280]">Loading home...</p>
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2640]">Available Sitters</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    A few sitters near {profile?.location || 'you'}.
                  </p>
                </div>
                <Link
                  href="/sitters"
                  className="text-sm font-semibold text-[#ff7a2d] hover:underline"
                >
                  See all sitters
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {nearbySitters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-[#fafafa] p-5 md:col-span-3">
                    <p className="text-sm text-[#6b7280]">
                      No sitters to preview right now. Open the sitters page to browse more.
                    </p>
                  </div>
                ) : (
                  nearbySitters.map((entry) => (
                    <Link
                      key={entry.profile.uid}
                      href={`/sitters/${entry.profile.uid}`}
                      className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-5 transition-colors hover:border-[#ffcfb2] hover:bg-[#fffaf6]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640]">{entry.profile.name}</h3>
                          <p className="text-sm text-[#6b7280]">{entry.profile.location}</p>
                        </div>
                        {entry.distanceKm !== undefined && (
                          <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-medium text-[#0f2640]">
                            {entry.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-[#6b7280]">
                        {entry.profile.bio || 'Friendly sitter profile available to view.'}
                      </p>
                      <p className="mt-4 text-sm font-medium text-[#0f2640]">
                        {entry.nextAvailableSlot
                          ? `Next slot: ${formatDateRange(
                              entry.nextAvailableSlot.startAt,
                              entry.nextAvailableSlot.endAt
                            )}`
                          : 'Open for bookings'}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-[#ff7a2d]">View full profile</p>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2640]">Community Requests</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Open requests you can help with.
                  </p>
                </div>
                <Link
                  href="/exchange?tab=community"
                  className="text-sm font-semibold text-[#ff7a2d] hover:underline"
                >
                  See all requests
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {communityRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-[#fafafa] p-5 md:col-span-3">
                    <p className="text-sm text-[#6b7280]">
                      No community requests to preview right now.
                    </p>
                  </div>
                ) : (
                  communityRequests.map((request) => (
                    <div
                      key={`${request.ownerId}-${request.id}`}
                      className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640]">
                            {request.ownerName || 'Pet owner'}
                          </h3>
                          <p className="text-sm text-[#6b7280]">
                            {request.petNames.join(', ') || 'Pet care request'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#fff1e6] px-3 py-1 text-xs font-medium text-[#ff7a2d]">
                          {request.creditsOffered} credits
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[#0f2640]">
                        {formatDateRange(request.startDate, request.endDate)}
                      </p>
                      <p className="mt-1 text-sm text-[#6b7280]">{request.location}</p>
                      <p className="mt-4 text-sm font-medium text-[#0f2640]">
                        {request.notes || 'Open request from the community'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
