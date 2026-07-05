'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserConversations } from '@/lib/messageService';
import { getPublicProfile } from '@/lib/publicProfileService';
import { getSitterCancellationStats, getSitterReviews } from '@/lib/requestService';
import { Conversation } from '@/types/message';
import { PublicUserProfile } from '@/types/profile';
import { RequestReview } from '@/types/request';
import type { SitterCancellationStats } from '@/lib/requestService';

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

function formatReviewDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    year: 'numeric',
  });
}

function renderStars(rating: number): string {
  const roundedRating = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)}`;
}

export default function SitterProfilePage() {
  const params = useParams<{ sitterId: string }>();
  const { user } = useAuth();
  const sitterId = Array.isArray(params.sitterId) ? params.sitterId[0] : params.sitterId;
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [cancellationStats, setCancellationStats] = useState<SitterCancellationStats | null>(null);
  const [reviews, setReviews] = useState<RequestReview[]>([]);
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

        const [publicProfile, sitterStats, sitterReviews] = await Promise.all([
          getPublicProfile(sitterId),
          getSitterCancellationStats(sitterId).catch((statsError) => {
            console.warn('Unable to load sitter cancellation stats:', statsError);
            return null;
          }),
          getSitterReviews(sitterId).catch((reviewsError) => {
            console.warn('Unable to load sitter reviews:', reviewsError);
            return [];
          }),
        ]);

        if (!active) {
          return;
        }

        if (!publicProfile) {
          setError('This sitter profile is not available right now.');
          setProfile(null);
          setCancellationStats(null);
          setReviews([]);
          setConversation(null);
          return;
        }

        setProfile(publicProfile);
        setCancellationStats(sitterStats);
        setReviews(sitterReviews);

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
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <ProfileAvatar
                      uid={profile.uid}
                      name={profile.name}
                      photoURL={profile.photoURL}
                      className="h-24 w-24 rounded-3xl border border-white/80 shadow-sm"
                    />
                    <div className="min-w-0">
                      <h1 className="text-3xl font-bold text-[#0f2640] sm:text-4xl">
                        {profile.name}
                      </h1>
                      <p className="mt-2 text-base text-[#516173]">
                        {profile.location}, {profile.country}
                      </p>
                    </div>
                  </div>
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
                    {profile.ratingCount > 0 && (
                      <p className="mt-1 text-sm tracking-[0.08em] text-[#ffb020]">
                        {renderStars(profile.ratingAverage)}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profile.ratingCount > 0
                        ? `${profile.ratingCount} ${profile.ratingCount === 1 ? 'review' : 'reviews'}`
                        : 'No reviews yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Trust level</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{profile.trustScore}%</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      Based on profile quality, verified email, completed care, and reviews.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:col-span-2">
                    <p className="text-sm text-[#6b7280]">Cancellation ratio</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {cancellationStats && cancellationStats.totalFinishedOrCancelled > 0
                        ? `${Math.round(cancellationStats.cancellationRatio * 100)}%`
                        : 'New'}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {cancellationStats && cancellationStats.totalFinishedOrCancelled > 0
                        ? `${cancellationStats.sitterCancelledCount} sitter cancellations from ${cancellationStats.totalFinishedOrCancelled} completed or cancelled care records. ${cancellationStats.sitterLateCancelledCount} were within 24 hours.`
                        : 'No completed or cancelled care records yet.'}
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

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0f2640]">Reviews</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Feedback from completed pet-care requests.
                  </p>
                </div>
                {reviews.length > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#0f2640]">
                      {profile.ratingAverage.toFixed(1)} / 5
                    </p>
                    <p className="text-sm tracking-[0.08em] text-[#ffb020]">
                      {renderStars(profile.ratingAverage)}
                    </p>
                  </div>
                )}
              </div>

              {reviews.length === 0 ? (
                <p className="mt-5 text-sm text-[#6b7280]">No reviews yet.</p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {reviews.map((review) => (
                    <article
                      key={`${review.reviewerId}-${review.reviewedAt.toISOString()}`}
                      className="rounded-2xl border border-[#e4e9ef] bg-[#fbfcfd] p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-[#0f2640]">{review.rating} / 5</p>
                          <p className="mt-1 text-sm tracking-[0.08em] text-[#ffb020]">
                            {renderStars(review.rating)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#0f2640]">
                            {review.reviewerName || 'Pet owner'}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#6b7280]">
                            {formatReviewDate(review.reviewedAt)}
                          </p>
                        </div>
                      </div>
                      {review.comment ? (
                        <p className="mt-4 text-sm leading-6 text-[#516173]">{review.comment}</p>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-[#6b7280]">No written comment.</p>
                      )}
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9aa6b2]">
                        Completed care review
                      </p>
                    </article>
                  ))}
                </div>
              )}
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

