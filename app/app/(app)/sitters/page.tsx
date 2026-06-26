'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CitySelect from '@/components/CitySelect';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { addFavoriteSitter, getFavoriteSitters, removeFavoriteSitter } from '@/lib/favoriteService';
import { PET_TYPE_OPTIONS } from '@/lib/petOptions';
import { reportUser } from '@/lib/moderationService';
import { getProfile } from '@/lib/profileService';
import { getAvailableSitters, NearbySitter } from '@/lib/sitterService';

function formatAvailabilityWindow(startAt: Date, endAt: Date): string {
  return `${startAt.toLocaleDateString()} ${startAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endAt.toLocaleDateString()} ${endAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatRequestedWindow(startAtValue: string, endAtValue: string): string | null {
  if (!startAtValue.trim() || !endAtValue.trim()) {
    return null;
  }

  const startAt = new Date(startAtValue);
  const endAt = new Date(endAtValue);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }

  return formatAvailabilityWindow(startAt, endAt);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TK';
}

function getExperienceLabel(level: string): string {
  switch (level) {
    case 'expert':
      return 'Expert sitter';
    case 'intermediate':
      return 'Experienced sitter';
    default:
      return 'New sitter';
  }
}

function getMatchLabel(matchScore: number): string {
  if (matchScore >= 80) {
    return 'Strong match';
  }

  if (matchScore >= 60) {
    return 'Good match';
  }

  return 'Possible match';
}

interface SitterSearchFilters {
  city?: string;
  requestedStartAt?: string;
  requestedEndAt?: string;
  petType?: string;
  petSize?: string;
  requiredExperienceLevel?: string;
}

export default function SittersPage() {
  const { user } = useAuth();
  const [sitters, setSitters] = useState<NearbySitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [petType, setPetType] = useState('');
  const [petSize, setPetSize] = useState('');
  const [requiredExperienceLevel, setRequiredExperienceLevel] = useState('');
  const [requestedStartAt, setRequestedStartAt] = useState('');
  const [requestedEndAt, setRequestedEndAt] = useState('');
  const [favoriteSitterIds, setFavoriteSitterIds] = useState<string[]>([]);
  const requestedWindowLabel = formatRequestedWindow(requestedStartAt, requestedEndAt);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError('');
        const [profile, favorites] = await Promise.all([
          getProfile(user.uid),
          getFavoriteSitters(user.uid),
        ]);

        setFavoriteSitterIds(favorites.map((favorite) => favorite.sitterId));

        if (profile) {
          setCity(profile.location || '');
        }

        const results = await getAvailableSitters({
          excludeUserId: user.uid,
          city: profile?.location || '',
          petTypes: [],
        });
        setSitters(results);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError('We could not load sitters right now. Please try again. ' + message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function runSearch(filters: SitterSearchFilters = {}) {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const nextCity = filters.city ?? city;
      const nextRequestedStartAt = filters.requestedStartAt ?? requestedStartAt;
      const nextRequestedEndAt = filters.requestedEndAt ?? requestedEndAt;
      const nextPetType = filters.petType ?? petType;
      const nextPetSize = filters.petSize ?? petSize;
      const nextRequiredExperienceLevel =
        filters.requiredExperienceLevel ?? requiredExperienceLevel;

      const hasStart = nextRequestedStartAt.trim().length > 0;
      const hasEnd = nextRequestedEndAt.trim().length > 0;
      if (hasStart !== hasEnd) {
        throw new Error('Choose both start and end times.');
      }

      let parsedRequestedStartAt: Date | undefined;
      let parsedRequestedEndAt: Date | undefined;

      if (hasStart && hasEnd) {
        parsedRequestedStartAt = new Date(nextRequestedStartAt);
        parsedRequestedEndAt = new Date(nextRequestedEndAt);

        if (
          Number.isNaN(parsedRequestedStartAt.getTime()) ||
          Number.isNaN(parsedRequestedEndAt.getTime())
        ) {
          throw new Error('Please enter valid dates and times.');
        }

        if (parsedRequestedEndAt.getTime() <= parsedRequestedStartAt.getTime()) {
          throw new Error('The end time must be after the start time.');
        }
      }

      const results = await getAvailableSitters({
        excludeUserId: user.uid,
        city: nextCity,
        petTypes: nextPetType ? [nextPetType] : [],
        petSize: nextPetSize || undefined,
        requiredExperienceLevel: nextRequiredExperienceLevel || undefined,
        requestedStartAt: parsedRequestedStartAt,
        requestedEndAt: parsedRequestedEndAt,
      });
      setSitters(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not search sitters right now. Please try again. ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(sitterId: string) {
    if (!user) return;
    const isFavorite = favoriteSitterIds.includes(sitterId);

    if (isFavorite) {
      await removeFavoriteSitter(user.uid, sitterId);
      setFavoriteSitterIds((prev) => prev.filter((id) => id !== sitterId));
    } else {
      await addFavoriteSitter(user.uid, sitterId);
      setFavoriteSitterIds((prev) => [...prev, sitterId]);
    }
  }

  async function handleReportSitter(sitterId: string) {
    if (!user) return;
    const reason = prompt('Tell us what feels wrong with this profile:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await reportUser(user.uid, sitterId, reason);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not send this report right now. Please try again. ' + message);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-72px)] bg-[#f4eee5] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#0f2640] sm:text-4xl">
            Find a sitter
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#425266] sm:text-base">
            Calm, trusted people near you. Read profiles, then send a request from the sitter page.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-[18px] border border-[#ded3c2] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="sitter-search-city" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                City
              </label>
              <CitySelect
                id="sitter-search-city"
                value={city}
                onChange={setCity}
                emptyLabel="All cities"
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-start" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                Care starts
              </label>
              <input
                id="sitter-search-start"
                type="datetime-local"
                value={requestedStartAt}
                onChange={(e) => setRequestedStartAt(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-end" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                Care ends
              </label>
              <input
                id="sitter-search-end"
                type="datetime-local"
                value={requestedEndAt}
                onChange={(e) => setRequestedEndAt(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              />
            </div>
            <div>
              <label htmlFor="sitter-search-pet-type" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                Pet type
              </label>
              <select
                id="sitter-search-pet-type"
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value);
                  if (e.target.value !== 'dog') {
                    setPetSize('');
                  }
                }}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">Any</option>
                {PET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.singularLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => runSearch()}
                className="w-full rounded-xl bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23]"
              >
                Search
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            {petType === 'dog' && (
            <div>
              <label htmlFor="sitter-search-dog-size" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                Dog size
              </label>
              <select
                id="sitter-search-dog-size"
                value={petSize}
                onChange={(e) => setPetSize(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">Any</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            )}
            <div>
              <label htmlFor="sitter-search-experience" className="mb-1 block text-xs font-semibold text-[#0f2640]">
                Experience
              </label>
              <select
                id="sitter-search-experience"
                value={requiredExperienceLevel}
                onChange={(e) => setRequiredExperienceLevel(e.target.value)}
                className="w-full rounded-xl border border-[#d8cbbb] bg-[#fffdf9] px-3 py-3 text-sm font-semibold text-[#0f2640] focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
              >
                <option value="">Any</option>
                <option value="beginner">Beginner+</option>
                <option value="intermediate">Intermediate+</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCity('');
                  setPetType('');
                  setPetSize('');
                  setRequiredExperienceLevel('');
                  setRequestedStartAt('');
                  setRequestedEndAt('');
                  void runSearch({
                    city: '',
                    requestedStartAt: '',
                    requestedEndAt: '',
                    petType: '',
                    petSize: '',
                    requiredExperienceLevel: '',
                  });
                }}
                className="w-full rounded-xl border border-[#d8cbbb] bg-white px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fffaf6]"
              >
                Browse all
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
            <span className="font-semibold text-[#6f7b87]">Quick filters:</span>
            <span className="rounded-full bg-[#fff1e7] px-3 py-2 font-semibold text-[#9a4b22]">
              {city || 'All cities'}
            </span>
            <span className="rounded-full bg-[#f2f5f8] px-3 py-2 font-semibold text-[#425266]">
              {petType ? PET_TYPE_OPTIONS.find((option) => option.value === petType)?.singularLabel || petType : 'Any pet'}
            </span>
            <span className="rounded-full bg-[#f2f5f8] px-3 py-2 font-semibold text-[#425266]">
              {requiredExperienceLevel ? getExperienceLabel(requiredExperienceLevel) : 'Any experience'}
            </span>
          </div>

          <p className="mt-4 text-sm text-[#0f2640]">
            {requestedWindowLabel
              ? `Showing sitters who are open for bookings around ${requestedWindowLabel}.`
              : `Showing sitters who are open for bookings${city ? ` in or near ${city}` : ''}.`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-[18px] border border-[#ded3c2] bg-white p-6">
            <p className="text-[#6b7280]">Loading sitters...</p>
          </div>
        ) : sitters.length === 0 ? (
          <div className="rounded-[18px] border border-[#ded3c2] bg-white p-6">
            <p className="text-[#6b7280]">
              {requestedWindowLabel
                ? 'No sitters found for this search. Try changing the date or city.'
                : 'No sitters found for this search. Try changing the city or filters.'}
            </p>
          </div>
        ) : (
          <>
          <p className="mb-4 text-sm text-[#425266]">
            <span className="font-bold text-[#0f2640]">{sitters.length} sitters</span>
            {city ? ` open for bookings in or near ${city}` : ' open for bookings'}
            {requestedWindowLabel ? ` for ${requestedWindowLabel}` : ''}.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sitters.map((entry) => (
              <article
                key={entry.profile.uid}
                className="relative flex min-h-[280px] flex-col rounded-[18px] border border-[#ded3c2] bg-white p-5 shadow-sm"
              >
                <button
                  onClick={() => toggleFavorite(entry.profile.uid)}
                  aria-label={favoriteSitterIds.includes(entry.profile.uid) ? 'Remove saved sitter' : 'Save sitter'}
                  className={`absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-colors ${
                    favoriteSitterIds.includes(entry.profile.uid)
                      ? 'border-[#f5c7b0] bg-[#fff1e7] text-[#e96b2c]'
                      : 'border-[#e3d7c7] bg-white text-[#b5a999] hover:bg-[#fffaf6]'
                  }`}
                >
                  {favoriteSitterIds.includes(entry.profile.uid) ? <>&#10084;</> : <>&#9825;</>}
                </button>

                <div className="flex gap-3 pr-10">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#0f2640] ${
                      entry.profile.photoURL ? 'bg-cover bg-center' : 'bg-[#efe3ee]'
                    }`}
                    style={
                      entry.profile.photoURL
                        ? { backgroundImage: `url(${entry.profile.photoURL})` }
                        : undefined
                    }
                  >
                    {!entry.profile.photoURL && getInitials(entry.profile.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight text-[#0f2640]">
                      {entry.profile.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#7a8794]">
                      {entry.profile.location || 'Location not added'}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-[#edf3f7] px-3 py-1 text-xs font-bold text-[#456170]">
                      {getMatchLabel(entry.matchScore)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#0f2640]">
                  <span className="font-bold text-[#e6a323]">&#9733;</span>
                  <span>
                  {entry.profile.ratingCount > 0
                    ? `${entry.profile.ratingAverage.toFixed(1)} (${entry.profile.ratingCount})`
                    : 'No ratings'}
                  </span>
                  <span className="text-[#7a8794]">|</span>
                  <span>{getExperienceLabel(entry.profile.experienceLevel)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e8f3ec] px-3 py-2 text-xs font-bold text-[#245d45]">
                    Open for bookings
                  </span>
                  <span
                    className={`rounded-full px-3 py-2 text-xs font-bold ${
                      entry.profileCompleted
                        ? 'bg-[#e8f3ec] text-[#245d45]'
                        : 'bg-[#f2f5f8] text-[#607080]'
                    }`}
                  >
                    {entry.profileCompleted ? 'Profile complete' : 'Needs details'}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#425266]">
                  {entry.profile.bio || entry.profile.petExperience || 'No bio yet.'}
                </p>

                {entry.nextAvailableSlot ? (
                  <div className="mt-4 text-sm font-semibold text-[#245d45]">
                    <span className="mr-1">&#9711;</span>
                    Open for bookings - next:{' '}
                    <span className="font-normal">
                      {formatAvailabilityWindow(
                        entry.nextAvailableSlot.startAt,
                        entry.nextAvailableSlot.endAt
                      )}
                    </span>
                  </div>
                ) : entry.hasDetailedAvailability ? (
                  <p className="mt-4 text-sm font-semibold text-[#245d45]">
                    This sitter is open for bookings, but their detailed time slots are private right now.
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[#6b7280]">
                    This sitter has not shared a public time summary yet. You can still contact them directly.
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#eee4d8] pt-4">
                  <button
                    onClick={() => handleReportSitter(entry.profile.uid)}
                    className="text-xs font-semibold text-[#8a97a3] hover:text-red-700"
                  >
                    Report
                  </button>
                  <Link
                    href={`/sitters/${entry.profile.uid}`}
                    className="rounded-full bg-[#e96b2c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d95f23]"
                  >
                    View profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
