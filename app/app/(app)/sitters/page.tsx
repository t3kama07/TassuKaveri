'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { addFavoriteSitter, getFavoriteSitters, removeFavoriteSitter } from '@/lib/favoriteService';
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

export default function SittersPage() {
  const { user } = useAuth();
  const [sitters, setSitters] = useState<NearbySitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [useDistance, setUseDistance] = useState(true);
  const [petType, setPetType] = useState('');
  const [petSize, setPetSize] = useState('');
  const [requiredExperienceLevel, setRequiredExperienceLevel] = useState('');
  const [requestedStartAt, setRequestedStartAt] = useState('');
  const [requestedEndAt, setRequestedEndAt] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
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
          setLatitude(profile.latitude);
          setLongitude(profile.longitude);
        }

        const results = await getAvailableSitters({
          excludeUserId: user.uid,
          city: profile?.location || '',
          latitude: profile?.latitude,
          longitude: profile?.longitude,
          maxDistanceKm: 10,
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

  async function runSearch(
    nextCity: string = city,
    nextLat: number | undefined = latitude,
    nextLng: number | undefined = longitude,
    nextRequestedStartAt: string = requestedStartAt,
    nextRequestedEndAt: string = requestedEndAt
  ) {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

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
        latitude: useDistance ? nextLat : undefined,
        longitude: useDistance ? nextLng : undefined,
        maxDistanceKm,
        petTypes: petType ? [petType] : [],
        petSize: petSize || undefined,
        requiredExperienceLevel: requiredExperienceLevel || undefined,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640] mb-2">Find a sitter</h1>
          <p className="text-[#6b7280]">
            Find someone nearby who can care for your pet. Results may depend on the sitter&apos;s saved times.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Care starts</label>
              <input
                type="datetime-local"
                value={requestedStartAt}
                onChange={(e) => setRequestedStartAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Care ends</label>
              <input
                type="datetime-local"
                value={requestedEndAt}
                onChange={(e) => setRequestedEndAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Distance (km)</label>
              <input
                type="number"
                min="1"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Pet Type</label>
              <select
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Any</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Pet Size</label>
              <select
                value={petSize}
                onChange={(e) => setPetSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Any</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Experience</label>
              <select
                value={requiredExperienceLevel}
                onChange={(e) => setRequiredExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Any</option>
                <option value="beginner">Beginner+</option>
                <option value="intermediate">Intermediate+</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-[#0f2640]">
                <input
                  type="checkbox"
                  checked={useDistance}
                  onChange={(e) => setUseDistance(e.target.checked)}
                />
                Use distance
              </label>
            </div>
            <div className="flex items-end">
              <div className="flex w-full gap-2">
                <button
                  onClick={() => runSearch()}
                  className="flex-1 px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm"
                >
                  Find sitters
                </button>
                <button
                  onClick={() => {
                    setRequestedStartAt('');
                    setRequestedEndAt('');
                    runSearch(city, latitude, longitude, '', '');
                  }}
                  className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Browse all
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6b7280] mt-3">
            Choose the date and time you need help. Leave them empty to browse all sitters.
          </p>
          <p className="text-xs text-[#6b7280] mt-1">
            Distance is based on your saved location. Some sitters may not have full times listed yet.
          </p>
          <p className="text-sm text-[#0f2640] mt-3">
            {requestedWindowLabel
              ? `Showing sitters who are open for bookings around ${requestedWindowLabel}.`
              : `Showing sitters who are open for bookings${city ? ` in or near ${city}` : ''}.`}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading sitters...</p>
          </div>
        ) : sitters.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">
              {requestedWindowLabel
                ? 'No sitters found for this search. Try changing the date, city, or distance.'
                : 'No sitters found for this search. Try changing the city or distance.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitters.map((entry) => (
              <div key={entry.profile.uid} className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">{entry.profile.name}</h3>
                <p className="text-sm text-[#6b7280]">{entry.profile.location}</p>
                {entry.distanceKm !== undefined && (
                  <p className="text-xs text-[#6b7280] mt-1">{entry.distanceKm.toFixed(1)} km away</p>
                )}
                <p className="text-xs text-[#6b7280] mt-1">
                  {entry.matchScore >= 80 ? 'Strong match' : 'Possible match'}
                </p>

                <div className="flex flex-wrap gap-2 mt-3 mb-3">
                  <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700">Open for bookings</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.profile.phoneVerified ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.profile.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.profileCompleted ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.profileCompleted ? 'Profile complete' : 'Profile needs details'}
                  </span>
                </div>

                <p className="text-sm text-[#0f2640] mb-2">
                  Rating:{' '}
                  {entry.profile.ratingCount > 0
                    ? `${entry.profile.ratingAverage.toFixed(1)} / 5 (${entry.profile.ratingCount})`
                    : 'No ratings'}
                </p>
                <p className="text-sm text-[#6b7280] mb-2">{entry.profile.bio || 'No bio yet.'}</p>
                <p className="text-sm text-[#6b7280]">
                  Experience: {entry.profile.petExperience || 'Not provided'}
                </p>
                {entry.nextAvailableSlot ? (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-medium text-blue-800">Next open time slot</p>
                    <p className="text-sm text-blue-700">
                      {formatAvailabilityWindow(
                        entry.nextAvailableSlot.startAt,
                        entry.nextAvailableSlot.endAt
                      )}
                    </p>
                  </div>
                ) : entry.hasDetailedAvailability ? (
                  <p className="mt-3 text-sm text-[#6b7280]">
                    This sitter is open for bookings, but their detailed time slots are private right now.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[#6b7280]">
                    This sitter has not shared a public time summary yet. You can still contact them directly.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/sitters/${entry.profile.uid}`}
                    className="px-3 py-1 text-sm rounded bg-[#ff7a2d] text-white hover:bg-[#e66a1f]"
                  >
                    View profile
                  </Link>
                  <button
                    onClick={() => toggleFavorite(entry.profile.uid)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {favoriteSitterIds.includes(entry.profile.uid) ? 'Saved' : 'Save sitter'}
                  </button>
                  <button
                    onClick={() => handleReportSitter(entry.profile.uid)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                  >
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
