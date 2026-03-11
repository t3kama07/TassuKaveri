'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { reportRequest } from '@/lib/moderationService';
import { applyToRequest, getAllOpenRequests, withdrawApplication } from '@/lib/requestService';
import { getProfile } from '@/lib/profileService';
import { Request } from '@/types/request';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function BrowseRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [applicationMessages, setApplicationMessages] = useState<Record<string, string>>({});
  const [cityFilter, setCityFilter] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [userLatitude, setUserLatitude] = useState<number | undefined>(undefined);
  const [userLongitude, setUserLongitude] = useState<number | undefined>(undefined);
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [user]);

  async function loadRequests() {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const [openRequests, profile] = await Promise.all([
        getAllOpenRequests(user.uid),
        getProfile(user.uid),
      ]);

      setRequests(openRequests);
      if (profile) {
        setCityFilter(profile.location || '');
        setUserLatitude(profile.latitude);
        setUserLongitude(profile.longitude);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load requests: ' + message);
    } finally {
      setLoading(false);
    }
  }

  function isAppliedByCurrentUser(request: Request): boolean {
    if (!user) return false;
    return Boolean(request.applications?.some((application) => application.sitterId === user.uid));
  }

  async function handleApply(request: Request) {
    if (!user) return;

    if (!confirm(`Apply for ${request.petNames.join(', ')} (${request.creditsOffered} credits)?`)) {
      return;
    }

    setProcessingRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await applyToRequest(
        request.ownerId,
        request.id,
        user.uid,
        applicationMessages[request.id] || ''
      );
      setSuccess(`Application submitted for ${request.petNames.join(', ')}.`);
      await loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to apply: ' + message);
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleWithdraw(request: Request) {
    if (!user) return;
    if (!confirm('Withdraw your application?')) {
      return;
    }

    setProcessingRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await withdrawApplication(request.ownerId, request.id, user.uid);
      setSuccess(`Application withdrawn for ${request.petNames.join(', ')}.`);
      await loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to withdraw application: ' + message);
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleReportRequest(request: Request) {
    if (!user) return;
    const reason = prompt('Report reason:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await reportRequest(user.uid, request.ownerId, request.id, reason);
      setSuccess('Request reported. Admin will review it.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to report request: ' + message);
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getCareTypeLabel(careType: string): string {
    const labels: Record<string, string> = {
      'daily-visit': 'Daily Visit',
      overnight: 'Overnight Stay',
      boarding: 'Boarding',
      walking: 'Dog Walking',
    };
    return labels[careType] || careType;
  }

  const filteredRequests = requests.filter((request) => {
    const cityMatches =
      cityFilter.trim() === '' ||
      request.location.toLowerCase().includes(cityFilter.trim().toLowerCase());
    if (!cityMatches) {
      return false;
    }

    if (!useDistanceFilter) {
      return true;
    }

    if (
      userLatitude === undefined ||
      userLongitude === undefined ||
      request.locationLat === undefined ||
      request.locationLng === undefined
    ) {
      return true;
    }

    return (
      distanceKm(userLatitude, userLongitude, request.locationLat, request.locationLng) <= maxDistanceKm
    );
  });

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0f2640] mb-2">Browse Requests</h1>
          <p className="text-[#6b7280]">Apply to open pet-sitting requests</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">City</label>
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f2640] mb-1">Max Distance (km)</label>
              <input
                type="number"
                min="1"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-[#0f2640]">
                <input
                  type="checkbox"
                  checked={useDistanceFilter}
                  onChange={(e) => setUseDistanceFilter(e.target.checked)}
                />
                Use distance filter
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadRequests}
                className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-[#6b7280]">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-[#6b7280]">No matching open requests right now.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request) => {
              const applied = isAppliedByCurrentUser(request);

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#0f2640] mb-1">{request.petNames.join(', ')}</h3>
                    <p className="text-sm text-[#6b7280]">Owner: {request.ownerName}</p>
                  </div>

                  <div className="mb-3">
                    <span className="inline-block bg-[#ff7a2d]/10 text-[#ff7a2d] px-3 py-1 rounded-full text-sm font-medium">
                      {getCareTypeLabel(request.careType)}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#6b7280] mb-1">Date Range</p>
                    <p className="text-[#0f2640] font-medium">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#6b7280] mb-1">Location</p>
                    <p className="text-[#0f2640] font-medium">{request.location}</p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#6b7280] mb-1">Credits Offered</p>
                    <p className="text-2xl font-bold text-[#ff7a2d]">{request.creditsOffered}</p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#6b7280] mb-1">Applicants</p>
                    <p className="text-sm text-[#0f2640]">{request.applications?.length || 0}</p>
                  </div>

                  {request.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-[#6b7280] mb-1">Notes</p>
                      <p className="text-sm text-[#0f2640]">{request.notes}</p>
                    </div>
                  )}

                  {(request.feedingSchedule ||
                    request.walkSchedule ||
                    request.medicationInstructions ||
                    request.sleepInstructions ||
                    request.specialWarnings) && (
                    <div className="mb-4 p-3 border border-gray-200 rounded-lg text-sm space-y-1">
                      <p className="font-medium text-[#0f2640]">Care Instructions</p>
                      {request.feedingSchedule && (
                        <p className="text-[#6b7280]">
                          <span className="font-medium text-[#0f2640]">Feeding:</span> {request.feedingSchedule}
                        </p>
                      )}
                      {request.walkSchedule && (
                        <p className="text-[#6b7280]">
                          <span className="font-medium text-[#0f2640]">Walks:</span> {request.walkSchedule}
                        </p>
                      )}
                      {request.medicationInstructions && (
                        <p className="text-[#6b7280]">
                          <span className="font-medium text-[#0f2640]">Medication:</span> {request.medicationInstructions}
                        </p>
                      )}
                      {request.sleepInstructions && (
                        <p className="text-[#6b7280]">
                          <span className="font-medium text-[#0f2640]">Sleep:</span> {request.sleepInstructions}
                        </p>
                      )}
                      {request.specialWarnings && (
                        <p className="text-[#6b7280]">
                          <span className="font-medium text-[#0f2640]">Warnings:</span> {request.specialWarnings}
                        </p>
                      )}
                    </div>
                  )}

                  {!applied && (
                    <textarea
                      value={applicationMessages[request.id] || ''}
                      onChange={(e) =>
                        setApplicationMessages((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Optional message to owner"
                      className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}

                  {applied ? (
                    <button
                      onClick={() => handleWithdraw(request)}
                      disabled={processingRequestId === request.id}
                      className="w-full border border-gray-400 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                    >
                      {processingRequestId === request.id ? 'Processing...' : 'Withdraw Application'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApply(request)}
                      disabled={processingRequestId === request.id}
                      className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequestId === request.id ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                  <button
                    onClick={() => handleReportRequest(request)}
                    className="w-full mt-2 border border-red-300 text-red-700 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    Report Request
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
