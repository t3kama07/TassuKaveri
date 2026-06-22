'use client';

import { Suspense, useState, useEffect, FormEvent, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CitySelect from '@/components/CitySelect';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserRequests,
  getSitterRequests,
  getDirectRequestsForSitter,
  getAllOpenRequests,
  createRequest,
  updateRequest,
  cancelRequest,
  deleteRequest,
  cancelAcceptedRequest,
  markAwaitingConfirmation,
  confirmCompletion,
  acceptApplication,
  acceptRequest,
  applyToRequest,
  calculateCreditsForRequestWindow,
  submitReview,
  withdrawApplication,
} from '@/lib/requestService';
import { getUserPets } from '@/lib/petService';
import { reportRequest } from '@/lib/moderationService';
import { getProfile } from '@/lib/profileService';
import { Request, CreateRequestData, CareType, RequestApplication } from '@/types/request';
import { Pet } from '@/types/pet';

type ExchangeTab = 'my-requests' | 'direct-requests' | 'community' | 'my-sits';

function resolveInitialTab(value: string | null): ExchangeTab {
  switch (value) {
    case 'direct-requests':
      return 'direct-requests';
    case 'community':
      return 'community';
    case 'my-sits':
      return 'my-sits';
    case 'my-requests':
    default:
      return 'my-requests';
  }
}

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

function parseFormDateTime(date: string, time: string): Date | null {
  if (!date.trim() || !time.trim()) {
    return null;
  }

  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRequestDuration(startAt: Date, endAt: Date): string {
  const durationMs = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '';
  }

  const totalMinutes = Math.ceil(durationMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function RequestsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const createParam = searchParams.get('create');
  const requestedSitterId = searchParams.get('sitterId');
  const requestedSitterName = searchParams.get('sitterName') || '';
  const [requests, setRequests] = useState<Request[]>([]);
  const [directRequests, setDirectRequests] = useState<Request[]>([]);
  const [communityRequests, setCommunityRequests] = useState<Request[]>([]);
  const [sitterJobs, setSitterJobs] = useState<Request[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ExchangeTab>(resolveInitialTab(tabParam));
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);
  const [processingCommunityRequestId, setProcessingCommunityRequestId] = useState<string | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [applicationMessages, setApplicationMessages] = useState<Record<string, string>>({});
  const [cityFilter, setCityFilter] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [userLatitude, setUserLatitude] = useState<number | undefined>(undefined);
  const [userLongitude, setUserLongitude] = useState<number | undefined>(undefined);
  const [useDistanceFilter, setUseDistanceFilter] = useState(true);

  // Form fields
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [careType, setCareType] = useState<CareType>('daily-visit');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [feedingSchedule, setFeedingSchedule] = useState('');
  const [walkSchedule, setWalkSchedule] = useState('');
  const [medicationInstructions, setMedicationInstructions] = useState('');
  const [sleepInstructions, setSleepInstructions] = useState('');
  const [specialWarnings, setSpecialWarnings] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const [userRequests, userPets, sitterRequests, directSitterRequests, openRequests, profile] = await Promise.all([
        getUserRequests(user.uid),
        getUserPets(user.uid),
        getSitterRequests(user.uid),
        getDirectRequestsForSitter(user.uid),
        getAllOpenRequests(user.uid),
        getProfile(user.uid),
      ]);
      setRequests(userRequests);
      setPets(userPets);
      setSitterJobs(sitterRequests);
      setDirectRequests(directSitterRequests);
      setCommunityRequests(openRequests);
      if (profile) {
        setCityFilter(profile.location || '');
        setUserLatitude(profile.latitude);
        setUserLongitude(profile.longitude);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not load your requests right now. Please try again. ' + message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setActiveTab(resolveInitialTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    if (createParam !== '1') {
      return;
    }

    setActiveTab('my-requests');
    setEditingRequest(null);
    setShowForm(true);
  }, [createParam, requestedSitterId]);

  function selectTab(tab: ExchangeTab) {
    setActiveTab(tab);
    setShowForm(false);
    setEditingRequest(null);
  }

  function handleAddNew() {
    setActiveTab('my-requests');
    setEditingRequest(null);
    setSelectedPetIds([]);
    setCareType('daily-visit');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('18:00');
    setLocation('');
    setNotes('');
    setFeedingSchedule('');
    setWalkSchedule('');
    setMedicationInstructions('');
    setSleepInstructions('');
    setSpecialWarnings('');
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleEdit(request: Request) {
    if (request.status !== 'open') {
      setError('You can only edit requests that are still open.');
      return;
    }

    setActiveTab('my-requests');
    setEditingRequest(request);
    setSelectedPetIds(request.petIds);
    setCareType(request.careType);
    setStartDate(request.startDate.toISOString().split('T')[0]);
    setStartTime(request.startDate.toTimeString().slice(0, 5));
    setEndDate(request.endDate.toISOString().split('T')[0]);
    setEndTime(request.endDate.toTimeString().slice(0, 5));
    setLocation(request.location);
    setNotes(request.notes || '');
    setFeedingSchedule(request.feedingSchedule || '');
    setWalkSchedule(request.walkSchedule || '');
    setMedicationInstructions(request.medicationInstructions || '');
    setSleepInstructions(request.sleepInstructions || '');
    setSpecialWarnings(request.specialWarnings || '');
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function handleCancel() {
    setShowForm(false);
    setEditingRequest(null);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const parsedStartDate = parseFormDateTime(startDate, startTime);
      const parsedEndDate = parseFormDateTime(endDate, endTime);

      if (!parsedStartDate || !parsedEndDate) {
        throw new Error('Please choose a start and end date with times.');
      }

      const autoCalculatedCredits = calculateCreditsForRequestWindow(parsedStartDate, parsedEndDate);

      const requestData: CreateRequestData = {
        petIds: selectedPetIds,
        careType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        location,
        creditsOffered: autoCalculatedCredits,
        audience: !editingRequest && requestedSitterId ? 'direct' : 'community',
        requestedSitterId: !editingRequest ? requestedSitterId || undefined : undefined,
        requestedSitterName: !editingRequest ? requestedSitterName || undefined : undefined,
        notes,
        feedingSchedule,
        walkSchedule,
        medicationInstructions,
        sleepInstructions,
        specialWarnings,
      };

      if (editingRequest) {
        await updateRequest(user.uid, editingRequest.id, requestData);
        setSuccess('Pet-care request updated.');
      } else {
        await createRequest(user.uid, requestData);
        setSuccess('Pet-care request sent.');
      }

      setShowForm(false);
      setEditingRequest(null);
      setActiveTab('my-requests');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not save this request right now. Please check the fields and try again. ' + message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest(request: Request) {
    if (!user) return;
    if (!confirm('Cancel this pet-care request? Sitters will no longer see it.')) return;

    setError('');
    setSuccess('');

    try {
      await cancelRequest(user.uid, request.id);
      setSuccess('Pet-care request cancelled.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not cancel this request right now. Please try again. ' + message);
    }
  }

  async function handleDelete(request: Request) {
    if (!user) return;
    if (!confirm('Delete this pet-care request? This cannot be undone.')) return;

    setError('');
    setSuccess('');

    try {
      await deleteRequest(user.uid, request.id);
      setSuccess('Pet-care request deleted.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not delete this request right now. Please try again. ' + message);
    }
  }

  async function handleMarkAwaitingConfirmation(request: Request) {
    if (!user) return;
    if (!confirm('Mark this pet care as finished? The owner must confirm before you receive the credits.')) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await markAwaitingConfirmation(request.ownerId, request.id, user.uid);
      setSuccess('Marked as finished. Waiting for the owner to confirm.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not mark this care as finished. Please try again. ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleConfirmCompletion(request: Request) {
    if (!user) return;
    if (!confirm('Confirm the care is finished? The sitter will receive the reserved credits.')) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await confirmCompletion(request.ownerId, request.id);
      setSuccess('Care confirmed. The sitter received the credits.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not confirm this care right now. Please try again. ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleCancelAcceptedRequest(request: Request) {
    if (!user) return;
    if (!confirm('Cancel this accepted pet care? The reserved credits will be returned to the owner.')) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await cancelAcceptedRequest(request.ownerId, request.id, user.uid);
      setSuccess('Pet care cancelled. The reserved credits were returned to the owner.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not cancel this pet care right now. Please try again. ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleAcceptApplicant(request: Request, application: RequestApplication) {
    if (!user) return;
    if (!confirm(`Choose ${application.sitterName} as the sitter? Credits will be reserved until the care is finished or cancelled.`)) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await acceptApplication(request.ownerId, request.id, application.sitterId);
      setSuccess(`Accepted ${application.sitterName}. The credits are reserved until the care is finished or cancelled.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not accept this sitter right now. Please try again. ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleSubmitReview(request: Request) {
    if (!user) return;

    const rating = reviewRatings[request.id] || 0;
    const comment = reviewComments[request.id] || '';

    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5.');
      return;
    }

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await submitReview(request.ownerId, request.id, rating, comment);
      setSuccess('Review sent. Thank you for helping the community.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not send your review right now. Please try again. ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  function isAppliedByCurrentUser(request: Request): boolean {
    if (!user) return false;
    return Boolean(request.applications?.some((application) => application.sitterId === user.uid));
  }

  async function handleApply(request: Request) {
    if (!user) return;
    if (!confirm(`Offer to help with ${request.petNames.join(', ')} for ${request.creditsOffered} credits?`)) {
      return;
    }

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await applyToRequest(
        request.ownerId,
        request.id,
        user.uid,
        applicationMessages[request.id] || ''
      );
      setSuccess(`Offer sent for ${request.petNames.join(', ')}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not send your offer right now. Please try again. ' + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleAcceptDirectRequest(request: Request) {
    if (!user) return;
    if (!confirm(`Accept this direct pet-care request for ${request.petNames.join(', ')}?`)) {
      return;
    }

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await acceptRequest(request.ownerId, request.id, user.uid);
      setSuccess(`Direct pet-care request accepted for ${request.petNames.join(', ')}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not accept this direct request right now. Please try again. ' + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleWithdraw(request: Request) {
    if (!user) return;
    if (!confirm('Withdraw your offer to help?')) {
      return;
    }

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await withdrawApplication(request.ownerId, request.id, user.uid);
      setSuccess(`Offer withdrawn for ${request.petNames.join(', ')}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not withdraw your offer right now. Please try again. ' + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleReportCommunityRequest(request: Request) {
    if (!user) return;
    const reason = prompt('Tell us what feels wrong with this request:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await reportRequest(user.uid, request.ownerId, request.id, reason);
      setSuccess('Request reported. An admin will review it.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not send this report right now. Please try again. ' + message);
    }
  }

  function togglePetSelection(petId: string) {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-50';
      case 'accepted':
        return 'text-green-600 bg-green-50';
      case 'awaiting_confirmation':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-gray-600 bg-gray-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'open':
        return 'Open';
      case 'accepted':
        return 'Accepted';
      case 'awaiting_confirmation':
        return 'Waiting for owner';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  function getCareTypeLabel(careType: string): string {
    const labels: Record<string, string> = {
      'daily-visit': 'Visit at home',
      overnight: 'Overnight care',
      boarding: 'Boarding',
      walking: 'Dog walk',
    };
    return labels[careType] || careType;
  }

  const filteredCommunityRequests = communityRequests.filter((request) => {
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
      distanceKm(userLatitude, userLongitude, request.locationLat, request.locationLng) <=
      maxDistanceKm
    );
  });

  const formStartAt = parseFormDateTime(startDate, startTime);
  const formEndAt = parseFormDateTime(endDate, endTime);
  const hasValidRequestWindow =
    Boolean(formStartAt) &&
    Boolean(formEndAt) &&
    formEndAt!.getTime() > formStartAt!.getTime();
  const autoCalculatedCredits = hasValidRequestWindow
    ? calculateCreditsForRequestWindow(formStartAt!, formEndAt!)
    : 0;
  const requestDurationLabel = hasValidRequestWindow
    ? formatRequestDuration(formStartAt!, formEndAt!)
    : '';

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                Exchange
              </p>
              <h1 className="mt-3 text-3xl font-bold text-[#0f2640] sm:text-4xl">
                Ask for pet care or offer to help
              </h1>
              <p className="mt-3 max-w-3xl text-[#516173]">
                Keep your pet-care requests, direct invites, and sitter jobs in one place.
              </p>
            </div>

            {!showForm && activeTab === 'my-requests' && (
              <button
                onClick={handleAddNew}
                className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                Ask for pet care
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">My pet-care requests</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{requests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Direct asks</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{directRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Open requests</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{communityRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Care I give</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{sitterJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Pets added</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{pets.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => selectTab('my-requests')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'my-requests'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            My requests
          </button>
          <button
            onClick={() => selectTab('direct-requests')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'direct-requests'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            Direct asks
          </button>
          <button
            onClick={() => selectTab('community')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'community'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            Open requests
          </button>
          <button
            onClick={() => selectTab('my-sits')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'my-sits'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            Care I give
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-6 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {activeTab === 'my-requests' && pets.length === 0 && !loading && !showForm && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
            Add your pet before you ask for pet care.
          </div>
        )}

        {activeTab === 'my-requests' && showForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#0f2640] mb-4">
              {editingRequest ? 'Edit pet-care request' : 'Ask for pet care'}
            </h2>
            {!editingRequest && requestedSitterId && requestedSitterName && (
              <div className="mb-4 rounded-2xl border border-[#ffd7bf] bg-[#fff7ef] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">
                  Asking {requestedSitterName} directly
                </p>
                <p className="mt-1 text-sm text-[#516173]">
                  Direct requests are sent to one sitter only. Chat opens after the request is accepted.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-2">
                  Pet that needs care
                </label>
                <p className="mb-2 text-sm text-[#6b7280]">Choose the pet that needs care.</p>
                {pets.length > 0 ? (
                  <div className="space-y-2">
                    {pets.map((pet) => (
                      <label key={pet.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPetIds.includes(pet.id)}
                          onChange={() => togglePetSelection(pet.id)}
                          className="w-4 h-4"
                        />
                        <span className="text-[#0f2640]">
                          {pet.name} ({pet.type})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed">
                      You have not added any pets yet.
                    </div>
                    <div className="mt-3 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-blue-800 font-medium">
                          Add your first pet before you ask for care.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/pets')}
                        className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Add your first pet
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Type of care
                </label>
                <p className="mb-2 text-sm text-[#6b7280]">Choose what kind of help your pet needs.</p>
                <select
                  value={careType}
                  onChange={(e) => setCareType(e.target.value as CareType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                >
                  <option value="daily-visit">Daily Visit</option>
                  <option value="overnight">Overnight</option>
                  <option value="boarding">Boarding</option>
                  <option value="walking">Walking</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Location
                </label>
                <p className="mb-2 text-sm text-[#6b7280]">Select the city where the care is needed.</p>
                <CitySelect
                  value={location}
                  onChange={setLocation}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div className="rounded-2xl border border-[#ffd7be] bg-[#fff8f2] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0f2640]">Credit cost</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      Credits are used instead of money. You spend credits when someone cares for your pet.
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-3xl font-bold text-[#ff7a2d]">
                      {hasValidRequestWindow ? autoCalculatedCredits : '--'}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {hasValidRequestWindow
                        ? `${requestDurationLabel} total`
                        : 'Select valid start and end times'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Notes for the sitter
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder="Feeding, walking, medicine, behavior, or anything important."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Feeding
                  </label>
                  <textarea
                    value={feedingSchedule}
                    onChange={(e) => setFeedingSchedule(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder="Times and food portions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Walks
                  </label>
                  <textarea
                    value={walkSchedule}
                    onChange={(e) => setWalkSchedule(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder="Walk times and duration"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Medicine
                  </label>
                  <textarea
                    value={medicationInstructions}
                    onChange={(e) => setMedicationInstructions(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder="Medicine dose and timing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Sleep
                  </label>
                  <textarea
                    value={sleepInstructions}
                    onChange={(e) => setSleepInstructions(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                    placeholder="Where and how the pet should sleep"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Important warnings
                </label>
                <textarea
                  value={specialWarnings}
                  onChange={(e) => setSpecialWarnings(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder="Anything the sitter must avoid or watch closely"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || pets.length === 0}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRequest ? 'Update request' : 'Ask for pet care'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-[#0f2640] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading requests...</p>
          </div>
        ) : (
          <>
            {activeTab === 'my-requests' && (
              <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0f2640] mb-4">My pet-care requests</h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-[#6b7280]">
                    You have not asked for pet care yet. {pets.length > 0 ? 'Use "Ask for pet care" to start.' : 'Add your first pet first.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640] mb-1">
                            {request.petNames.join(', ')}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getStatusText(request.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ff7a2d]">{request.creditsOffered} credits</p>
                          {request.status === 'accepted' && (
                            <p className="text-xs text-[#6b7280]">Reserved until care is finished or cancelled</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-[#6b7280]">Reserved until you confirm the care is finished</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[#6b7280]">Care type:</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Location:</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Starts:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.startDate.toLocaleDateString()} at {request.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Ends:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.endDate.toLocaleDateString()} at {request.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-[#6b7280]">Notes:</p>
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
                              <span className="font-medium text-[#0f2640]">Feeding:</span>{' '}
                              {request.feedingSchedule}
                            </p>
                          )}
                          {request.walkSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Walks:</span>{' '}
                              {request.walkSchedule}
                            </p>
                          )}
                          {request.medicationInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Medication:</span>{' '}
                              {request.medicationInstructions}
                            </p>
                          )}
                          {request.sleepInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Sleep:</span>{' '}
                              {request.sleepInstructions}
                            </p>
                          )}
                          {request.specialWarnings && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Warnings:</span>{' '}
                              {request.specialWarnings}
                            </p>
                          )}
                        </div>
                      )}

                      {request.sitterName && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-[#6b7280]">Sitter:</p>
                          <p className="text-sm text-[#0f2640] font-medium">{request.sitterName}</p>
                        </div>
                      )}

                      {request.audience === 'direct' && request.requestedSitterName && request.status === 'open' && (
                        <div className="mb-4 p-3 bg-[#fff7ef] border border-[#ffd7bf] rounded-lg">
                          <p className="text-sm text-[#6b7280]">Direct request sent to:</p>
                          <p className="text-sm text-[#0f2640] font-medium">{request.requestedSitterName}</p>
                          <p className="mt-1 text-sm text-[#516173]">
                            This sitter can see it in Direct asks.
                          </p>
                        </div>
                      )}

                      {request.status === 'open' && request.audience !== 'direct' && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                          <p className="text-sm text-[#6b7280] mb-2">
                            Offers to help: {request.applications?.length || 0}
                          </p>
                          {!request.applications || request.applications.length === 0 ? (
                            <p className="text-sm text-[#6b7280]">No offers yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {request.applications.map((application) => (
                                <div
                                  key={application.sitterId}
                                  className="flex items-center justify-between border border-gray-100 rounded p-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[#0f2640]">
                                      {application.sitterName}
                                    </p>
                                    {application.message && (
                                      <p className="text-xs text-[#6b7280]">{application.message}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleAcceptApplicant(request, application)}
                                    disabled={actioningRequestId === request.id}
                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {actioningRequestId === request.id ? 'Processing...' : 'Choose sitter'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {request.status === 'completed' && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                          {request.review ? (
                            <>
                              <p className="text-sm font-medium text-[#0f2640] mb-1">Your review</p>
                              <p className="text-sm text-[#0f2640]">Rating: {request.review.rating}/5</p>
                              <p className="text-sm text-[#6b7280]">{request.review.comment || 'No comment'}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-[#0f2640] mb-2">Rate this sitter</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <select
                                  value={reviewRatings[request.id] || ''}
                                  onChange={(e) =>
                                    setReviewRatings((prev) => ({
                                      ...prev,
                                      [request.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">Rating</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                                <input
                                  type="text"
                                  value={reviewComments[request.id] || ''}
                                  onChange={(e) =>
                                    setReviewComments((prev) => ({
                                      ...prev,
                                      [request.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Short comment"
                                  className="px-2 py-1 border border-gray-300 rounded text-sm md:col-span-2"
                                />
                              </div>
                              <button
                                onClick={() => handleSubmitReview(request)}
                                disabled={actioningRequestId === request.id}
                                className="mt-2 px-3 py-1 text-sm bg-[#ff7a2d] text-white rounded hover:bg-[#e66a1f] transition-colors disabled:opacity-50"
                              >
                                {actioningRequestId === request.id ? 'Submitting...' : 'Send review'}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {request.status === 'open' && (
                          <>
                            <button
                              onClick={() => handleEdit(request)}
                              className="px-3 py-1 text-sm border border-[#ff7a2d] text-[#ff7a2d] rounded hover:bg-[#ff7a2d] hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancelRequest(request)}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {request.status === 'awaiting_confirmation' && (
                          <>
                            <button
                              onClick={() => handleConfirmCompletion(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? 'Processing...' : 'Confirm care is finished'}
                            </button>
                            <button
                              onClick={() => handleCancelAcceptedRequest(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? 'Processing...' : 'Cancel pet care'}
                            </button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => handleCancelAcceptedRequest(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? 'Processing...' : 'Cancel pet care'}
                            </button>
                          </>
                        )}
                        {(request.status === 'open' || request.status === 'cancelled') && (
                          <button
                            onClick={() => handleDelete(request)}
                            className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {activeTab === 'direct-requests' && (
              <div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                  <h2 className="text-2xl font-bold text-[#0f2640]">Direct asks</h2>
                  <p className="mt-2 text-sm text-[#6b7280]">
                    These pet-care requests were sent only to you.
                  </p>
                </div>

                {directRequests.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-[#6b7280]">No direct asks right now.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {directRequests.map((request) => (
                      <div
                        key={`${request.ownerId}-${request.id}`}
                        className="bg-white rounded-2xl border border-[#ffd7bf] p-6 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#0f2640]">{request.petNames.join(', ')}</h3>
                            <p className="text-sm text-[#6b7280]">Owner: {request.ownerName}</p>
                          </div>
                          <span className="rounded-full bg-[#fff1e6] px-3 py-1 text-xs font-medium text-[#ff7a2d]">
                            Direct ask
                          </span>
                        </div>

                        <div className="mb-3">
                          <span className="inline-block rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]">
                            {getCareTypeLabel(request.careType)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <p className="text-[#6b7280]">Dates</p>
                            <p className="font-medium text-[#0f2640]">
                              {request.startDate.toLocaleDateString()} - {request.endDate.toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#6b7280]">Credits you earn</p>
                            <p className="font-medium text-[#ff7a2d]">{request.creditsOffered}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[#6b7280]">Location</p>
                            <p className="font-medium text-[#0f2640]">{request.location}</p>
                          </div>
                        </div>

                        {request.notes && (
                          <div className="mb-4 rounded-xl bg-gray-50 p-3">
                            <p className="text-sm text-[#6b7280] mb-1">Notes</p>
                            <p className="text-sm text-[#0f2640]">{request.notes}</p>
                          </div>
                        )}

                        <button
                          onClick={() => handleAcceptDirectRequest(request)}
                          disabled={processingCommunityRequestId === request.id}
                          className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                        >
                          {processingCommunityRequestId === request.id ? 'Processing...' : 'Accept direct ask'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'community' && (
              <div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#0f2640] mb-1">City</label>
                      <CitySelect
                        value={cityFilter}
                        onChange={setCityFilter}
                        emptyLabel="All cities"
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
                        onClick={() => loadData()}
                        className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[#6b7280]">
                    Open requests can be seen by available sitters. Offer to help only when the time works for you.
                  </p>
                </div>

                {filteredCommunityRequests.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-[#6b7280]">No open pet-care requests found.</p>
                    <p className="mt-2 text-sm text-[#6b7280]">Try changing the city or distance.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCommunityRequests.map((request) => {
                      const applied = isAppliedByCurrentUser(request);

                      return (
                        <div
                          key={`${request.ownerId}-${request.id}`}
                          className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-[#0f2640]">{request.petNames.join(', ')}</h3>
                              <p className="text-sm text-[#6b7280]">Owner: {request.ownerName}</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                              {getStatusText(request.status)}
                            </span>
                          </div>

                          <div className="mb-3">
                            <span className="inline-block bg-[#ff7a2d]/10 text-[#ff7a2d] px-3 py-1 rounded-full text-sm font-medium">
                              {getCareTypeLabel(request.careType)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <p className="text-[#6b7280]">Dates</p>
                              <p className="font-medium text-[#0f2640]">
                                {request.startDate.toLocaleDateString()} - {request.endDate.toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#6b7280]">Credits you earn</p>
                              <p className="font-medium text-[#ff7a2d]">{request.creditsOffered}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[#6b7280]">Location</p>
                              <p className="font-medium text-[#0f2640]">{request.location}</p>
                            </div>
                          </div>

                          {request.notes && (
                            <div className="mb-4 rounded-xl bg-gray-50 p-3">
                              <p className="text-sm text-[#6b7280] mb-1">Notes</p>
                              <p className="text-sm text-[#0f2640]">{request.notes}</p>
                            </div>
                          )}

                          {(request.feedingSchedule ||
                            request.walkSchedule ||
                            request.medicationInstructions ||
                            request.sleepInstructions ||
                            request.specialWarnings) && (
                            <div className="mb-4 p-3 border border-gray-200 rounded-xl text-sm space-y-1">
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
                                setApplicationMessages((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Optional message to the owner"
                              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          )}

                          {applied ? (
                            <button
                              onClick={() => handleWithdraw(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full border border-gray-400 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? 'Processing...' : 'Withdraw offer'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? 'Sending...' : 'Offer to help'}
                            </button>
                          )}
                          <button
                            onClick={() => handleReportCommunityRequest(request)}
                            className="w-full mt-2 border border-red-300 text-red-700 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors font-medium"
                          >
                            Report request
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-sits' && (
              <div>
                <h2 className="text-2xl font-bold text-[#0f2640] mb-4">Care I give</h2>
                {sitterJobs.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-[#6b7280]">
                      You are not helping with any pet care yet. Check Direct asks or browse Open requests.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sitterJobs.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#0f2640] mb-1">
                            {request.petNames.join(', ')}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getStatusText(request.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#ff7a2d]">{request.creditsOffered} credits</p>
                          {request.status === 'accepted' && (
                            <p className="text-xs text-green-600">You receive these after the owner confirms the care is finished.</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-yellow-600">Waiting for the owner to confirm.</p>
                          )}
                          {request.status === 'completed' && (
                            <p className="text-xs text-green-600">(Earned)</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[#6b7280]">Owner:</p>
                          <p className="text-[#0f2640] font-medium">{request.ownerName}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Care type:</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Location:</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Starts:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.startDate.toLocaleDateString()} at {request.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Ends:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.endDate.toLocaleDateString()} at {request.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-[#6b7280]">Notes:</p>
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
                              <span className="font-medium text-[#0f2640]">Feeding:</span>{' '}
                              {request.feedingSchedule}
                            </p>
                          )}
                          {request.walkSchedule && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Walks:</span>{' '}
                              {request.walkSchedule}
                            </p>
                          )}
                          {request.medicationInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Medication:</span>{' '}
                              {request.medicationInstructions}
                            </p>
                          )}
                          {request.sleepInstructions && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Sleep:</span>{' '}
                              {request.sleepInstructions}
                            </p>
                          )}
                          {request.specialWarnings && (
                            <p className="text-[#6b7280]">
                              <span className="font-medium text-[#0f2640]">Warnings:</span>{' '}
                              {request.specialWarnings}
                            </p>
                          )}
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkAwaitingConfirmation(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? 'Processing...' : 'Mark care as finished'}
                          </button>
                          <button
                            onClick={() => handleCancelAcceptedRequest(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? 'Processing...' : 'Cancel pet care'}
                          </button>
                        </div>
                      )}
                      {request.status === 'awaiting_confirmation' && (
                        <div className="flex gap-2">
                          <div className="px-3 py-1 text-sm bg-yellow-50 border border-yellow-300 text-yellow-700 rounded">
                            Awaiting owner confirmation
                          </div>
                          <button
                            onClick={() => handleCancelAcceptedRequest(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? 'Processing...' : 'Cancel pet care'}
                          </button>
                        </div>
                      )}
                    </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-[#6b7280]">Loading requests...</div>
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  );
}
