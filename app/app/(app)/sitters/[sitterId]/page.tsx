'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserConversations } from '@/lib/messageService';
import { getPublicProfile } from '@/lib/publicProfileService';
import { Conversation } from '@/types/message';
import { PublicUserProfile } from '@/types/profile';

function formatDateTimeRange(startAt?: Date, endAt?: Date): string {
  if (!startAt || !endAt) {
    return 'Open for bookings';
  }

  const dateLabel = startAt.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const startTime = startAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = endAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel}, ${startTime} - ${endTime}`;
}

function formatList(values: string[], emptyLabel: string): string {
  return values.length > 0 ? values.join(', ') : emptyLabel;
}

export default function SitterProfilePage() {
  const params = useParams<{ sitterId: string }>();
  const { user } = useAuth();
  const sitterId = Array.isArray(params.sitterId) ? params.sitterId[0] : params.sitterId;
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSitterProfile() {
      if (!user || !sitterId) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        const publicProfile = await getPublicProfile(sitterId);

        if (!active) {
          return;
        }

        if (!publicProfile) {
          setError('This sitter profile is not available right now.');
          setProfile(null);
          setConversation(null);
          return;
        }

        setProfile(publicProfile);

        try {
          const conversations = await getUserConversations(user.uid);
          if (!active) {
            return;
          }

          const existingConversation =
            conversations.find((item) => item.otherUserId === sitterId) ?? null;

          setConversation(existingConversation);
        } catch (conversationError) {
          console.warn('Unable to load conversations for sitter profile:', conversationError);
          if (active) {
            setConversation(null);
          }
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError('We could not load this sitter profile right now. Please try again. ' + message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSitterProfile();

    return () => {
      active = false;
    };
  }, [sitterId, user]);

  const isOwnProfile = user?.uid === sitterId;
  const createRequestHref = profile
    ? `/exchange?tab=my-requests&create=1&sitterId=${profile.uid}&sitterName=${encodeURIComponent(profile.name)}`
    : '/exchange?tab=my-requests';
  const messageHref = conversation
    ? `/messages?conversationId=${encodeURIComponent(conversation.conversationId)}`
    : '/messages';

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/sitters" className="text-sm font-semibold text-[#ff7a2d] hover:underline">
            Back to sitters
          </Link>
          {isOwnProfile && (
            <Link href="/profile" className="text-sm font-semibold text-[#0f2640] hover:underline">
              Edit my profile
            </Link>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-[#6b7280]">Loading sitter profile...</p>
          </div>
        ) : profile ? (
          <>
            <section className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                    Sitter Profile
                  </p>
                  <h1 className="mt-3 text-3xl font-bold text-[#0f2640] sm:text-4xl">
                    {profile.name}
                  </h1>
                  <p className="mt-2 text-base text-[#516173]">
                    {profile.location}, {profile.country}
                  </p>
                  <p className="mt-4 max-w-3xl text-[#516173]">
                    {profile.bio || 'This sitter has not added a bio yet.'}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {!isOwnProfile && (
                      <Link
                        href={createRequestHref}
                        className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                      >
                        Ask this sitter
                      </Link>
                    )}

                    {!isOwnProfile && conversation && (
                      <Link
                        href={messageHref}
                        className="rounded-full border border-[#cfd8e3] bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
                      >
                        Open messages
                      </Link>
                    )}

                    {!isOwnProfile && !conversation && (
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full border border-[#e0e7ef] bg-white px-5 py-3 text-sm font-semibold text-[#9aa6b2]"
                        title="Messages open after your first request or application."
                      >
                        Messages open after acceptance
                      </button>
                    )}
                  </div>

                  {!isOwnProfile && !conversation && (
                    <p className="mt-3 text-sm text-[#6b7280]">
                      Chat opens after a pet-care request is accepted.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Rating</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {profile.ratingCount > 0 ? profile.ratingAverage.toFixed(1) : 'New'}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profile.ratingCount > 0
                        ? `${profile.ratingCount} reviews`
                        : 'No reviews yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Trust level</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{profile.trustScore}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profile.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:col-span-2">
                    <p className="text-sm text-[#6b7280]">Next time they can help</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2640]">
                      {formatDateTimeRange(profile.nextAvailableStartAt, profile.nextAvailableEndAt)}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profile.hasDetailedAvailability
                        ? 'This sitter has shared a public time summary.'
                        : 'Some sitters do not list all times. You can ask directly.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#0f2640]">Experience</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0f2640]">About their care style</p>
                    <p className="mt-1 text-sm text-[#516173]">
                      {profile.petExperience || 'No experience notes added yet.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f2640]">Experience level</p>
                    <p className="mt-1 text-sm text-[#516173]">{profile.experienceLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f2640]">Pet types</p>
                    <p className="mt-1 text-sm text-[#516173]">
                      {formatList(profile.petTypeExperience, 'Not specified')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f2640]">Preferred pet sizes</p>
                    <p className="mt-1 text-sm text-[#516173]">
                      {formatList(profile.preferredPetSize, 'Not specified')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#0f2640]">Good To Know</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]">
                    {profile.availability === 'available' ? 'Open for bookings' : 'Not available'}
                  </span>
                  {profile.phoneVerified && (
                    <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-sm font-medium text-[#047857]">
                      Phone verified
                    </span>
                  )}
                  {profile.experienceWithDogs && (
                    <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-sm font-medium text-[#c2410c]">
                      Dog experience
                    </span>
                  )}
                  {profile.experienceWithCats && (
                    <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-sm font-medium text-[#6d28d9]">
                      Cat experience
                    </span>
                  )}
                  {profile.experienceWithLargeDogs && (
                    <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-medium text-[#1d4ed8]">
                      Large dog care
                    </span>
                  )}
                  {profile.experienceWithSeniorPets && (
                    <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-sm font-medium text-[#92400e]">
                      Senior pet care
                    </span>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-[#fafafa] p-4">
                  <p className="text-sm font-semibold text-[#0f2640]">Best next step</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    Ask this sitter for your pet and dates. Chat opens after the request is accepted.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-[#6b7280]">This sitter profile could not be found.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

