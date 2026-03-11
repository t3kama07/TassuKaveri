'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { addFavoriteSitter, getFavoriteSitters, removeFavoriteSitter } from '@/lib/favoriteService';
import { reportUser } from '@/lib/moderationService';
import { getProfile } from '@/lib/profileService';
import { getAvailableSitters, NearbySitter } from '@/lib/sitterService';

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
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [favoriteSitterIds, setFavoriteSitterIds] = useState<string[]>([]);

  useEffect(() => {
    initializeAndSearch();
  }, [user]);

  async function initializeAndSearch() {
    if (!user) return;

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

      await runSearch(profile?.location || '', profile?.latitude, profile?.longitude);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load sitters: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(
    nextCity: string = city,
    nextLat: number | undefined = latitude,
    nextLng: number | undefined = longitude
  ) {
    if (!user) return;

    try {
      setLoading(true);
      const results = await getAvailableSitters({
        excludeUserId: user.uid,
        city: nextCity,
        latitude: useDistance ? nextLat : undefined,
        longitude: useDistance ? nextLng : undefined,
        maxDistanceKm,
        petTypes: petType ? [petType] : [],
        petSize: petSize || undefined,
        requiredExperienceLevel: requiredExperienceLevel || undefined,
      });
      setSitters(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to search sitters: ' + message);
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
    const reason = prompt('Report reason:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await reportUser(user.uid, sitterId, reason);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to report sitter: ' + message);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640] mb-2">Find Sitters</h1>
          <p className="text-[#6b7280]">Browse available sitters near your location.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Within (km)</label>
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
                Use distance filter
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => runSearch()}
                className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading sitters...</p>
          </div>
        ) : sitters.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">No available sitters found for this filter.</p>
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
                <p className="text-xs text-[#6b7280] mt-1">Match score: {entry.matchScore}</p>

                <div className="flex flex-wrap gap-2 mt-3 mb-3">
                  <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700">Available</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.emailVerified ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.profile.phoneVerified ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.profile.phoneVerified ? 'Phone Verified' : 'Phone Not Verified'}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.profileCompleted ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.profileCompleted ? 'Profile Completed' : 'Profile Incomplete'}
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
                <button
                  onClick={() => toggleFavorite(entry.profile.uid)}
                  className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  {favoriteSitterIds.includes(entry.profile.uid) ? 'Remove Favorite' : 'Add Favorite'}
                </button>
                <button
                  onClick={() => handleReportSitter(entry.profile.uid)}
                  className="mt-3 ml-2 px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                >
                  Report
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
