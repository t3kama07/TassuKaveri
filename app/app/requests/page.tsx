'use client';

import { Suspense, useState, useEffect, FormEvent, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserRequests,
  getSitterRequests,
  getAllOpenRequests,
  createRequest,
  updateRequest,
  cancelRequest,
  deleteRequest,
  cancelAcceptedRequest,
  markAwaitingConfirmation,
  confirmCompletion,
  acceptApplication,
  applyToRequest,
  submitReview,
  withdrawApplication,
} from '@/lib/requestService';
import { getUserPets } from '@/lib/petService';
import { reportRequest } from '@/lib/moderationService';
import { getProfile } from '@/lib/profileService';
import { Request, CreateRequestData, CareType, RequestApplication } from '@/types/request';
import { Pet } from '@/types/pet';

type ExchangeTab = 'my-requests' | 'community' | 'my-sits';

function resolveInitialTab(value: string | null): ExchangeTab {
  switch (value) {
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

function RequestsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const createParam = searchParams.get('create');
  const requestedSitterId = searchParams.get('sitterId');
  const requestedSitterName = searchParams.get('sitterName') || '';
  const [requests, setRequests] = useState<Request[]>([]);
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
  const [creditsOffered, setCreditsOffered] = useState(10);
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
      const [userRequests, userPets, sitterRequests, openRequests, profile] = await Promise.all([
        getUserRequests(user.uid),
        getUserPets(user.uid),
        getSitterRequests(user.uid),
        getAllOpenRequests(user.uid),
        getProfile(user.uid),
      ]);
      setRequests(userRequests);
      setPets(userPets);
      setSitterJobs(sitterRequests);
      setCommunityRequests(openRequests);
      if (profile) {
        setCityFilter(profile.location || '');
        setUserLatitude(profile.latitude);
        setUserLongitude(profile.longitude);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load data: ' + message);
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
    setCreditsOffered(10);
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
      setError('Can only edit open requests');
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
    setCreditsOffered(request.creditsOffered);
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
      const requestData: CreateRequestData = {
        petIds: selectedPetIds,
        careType,
        startDate: new Date(`${startDate}T${startTime}`),
        endDate: new Date(`${endDate}T${endTime}`),
        location,
        creditsOffered,
        notes,
        feedingSchedule,
        walkSchedule,
        medicationInstructions,
        sleepInstructions,
        specialWarnings,
      };

      if (editingRequest) {
        await updateRequest(user.uid, editingRequest.id, requestData);
        setSuccess('Request updated successfully');
      } else {
        await createRequest(user.uid, requestData);
        setSuccess('Request created successfully');
      }

      setShowForm(false);
      setEditingRequest(null);
      setActiveTab('my-requests');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to save request: ' + message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest(request: Request) {
    if (!user) return;
    if (!confirm(`Are you sure you want to cancel this request?`)) return;

    setError('');
    setSuccess('');

    try {
      await cancelRequest(user.uid, request.id);
      setSuccess('Request cancelled successfully');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to cancel request: ' + message);
    }
  }

  async function handleDelete(request: Request) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete this request?`)) return;

    setError('');
    setSuccess('');

    try {
      await deleteRequest(user.uid, request.id);
      setSuccess('Request deleted successfully');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to delete request: ' + message);
    }
  }

  async function handleMarkAwaitingConfirmation(request: Request) {
    if (!user) return;
    if (!confirm(`Mark this job as completed? The owner will need to confirm before credits are released.`)) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await markAwaitingConfirmation(request.ownerId, request.id, user.uid);
      setSuccess('Job marked as completed! Waiting for owner confirmation.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to mark as completed: ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleConfirmCompletion(request: Request) {
    if (!user) return;
    if (!confirm(`Confirm that the job is completed? Credits will be released to the sitter.`)) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await confirmCompletion(request.ownerId, request.id);
      setSuccess('Request completed! Credits have been released to the sitter.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to confirm completion: ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleCancelAcceptedRequest(request: Request) {
    if (!user) return;
    if (!confirm(`Cancel this accepted request? Credits will be refunded to the owner.`)) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await cancelAcceptedRequest(request.ownerId, request.id, user.uid);
      setSuccess('Request cancelled successfully! Credits have been refunded to the owner.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to cancel request: ' + message);
    } finally {
      setActioningRequestId(null);
    }
  }

  async function handleAcceptApplicant(request: Request, application: RequestApplication) {
    if (!user) return;
    if (!confirm(`Accept ${application.sitterName} for this request?`)) return;

    setActioningRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await acceptApplication(request.ownerId, request.id, application.sitterId);
      setSuccess(`Accepted ${application.sitterName}. Credits moved to escrow.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to accept applicant: ' + message);
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
      setSuccess('Review submitted successfully.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to submit review: ' + message);
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
    if (!confirm(`Apply for ${request.petNames.join(', ')} (${request.creditsOffered} credits)?`)) {
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
      setSuccess(`Application submitted for ${request.petNames.join(', ')}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to apply: ' + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleWithdraw(request: Request) {
    if (!user) return;
    if (!confirm('Withdraw your application?')) {
      return;
    }

    setProcessingCommunityRequestId(request.id);
    setError('');
    setSuccess('');

    try {
      await withdrawApplication(request.ownerId, request.id, user.uid);
      setSuccess(`Application withdrawn for ${request.petNames.join(', ')}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to withdraw application: ' + message);
    } finally {
      setProcessingCommunityRequestId(null);
    }
  }

  async function handleReportCommunityRequest(request: Request) {
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
        return 'Awaiting confirmation';
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
      'daily-visit': 'Daily Visit',
      overnight: 'Overnight Stay',
      boarding: 'Boarding',
      walking: 'Dog Walking',
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
                Manage requests and sitter jobs in one place
              </h1>
              <p className="mt-3 max-w-3xl text-[#516173]">
                Create your own requests, browse community needs, and track the sits you are helping with.
              </p>
            </div>

            {!showForm && activeTab === 'my-requests' && (
              <button
                onClick={handleAddNew}
                className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                Create Request
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">My Requests</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{requests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Community Requests</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{communityRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">My Sits</p>
              <p className="mt-2 text-3xl font-bold text-[#0f2640]">{sitterJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-[#6b7280]">Pets Ready</p>
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
            My Requests
          </button>
          <button
            onClick={() => selectTab('community')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'community'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            Community Requests
          </button>
          <button
            onClick={() => selectTab('my-sits')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'my-sits'
                ? 'bg-[#0f2640] text-white'
                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-gray-50'
            }`}
          >
            My Sits
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
            You need to add pets before creating requests. Go to the Pets page first.
          </div>
        )}

        {activeTab === 'my-requests' && showForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#0f2640] mb-4">
              {editingRequest ? 'Edit Request' : 'Create New Request'}
            </h2>
            {!editingRequest && requestedSitterId && requestedSitterName && (
              <div className="mb-4 rounded-2xl border border-[#ffd7bf] bg-[#fff7ef] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">
                  Creating a request for {requestedSitterName}
                </p>
                <p className="mt-1 text-sm text-[#516173]">
                  Fill in your pet details and dates here. Once the request is created, you can
                  continue from Exchange and Messages if a conversation already exists.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-2">
                  Select Pet(s)
                </label>
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
                      No pets available
                    </div>
                    <div className="mt-3 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-blue-800 font-medium">
                          You need to add at least one pet before creating a request.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/pets')}
                        className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        + Add a Pet
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Care Type
                </label>
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
                    Start Date
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
                    Start Time
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
                    End Date
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
                    End Time
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
                  Location (City)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="e.g., Helsinki"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Credits Offered
                </label>
                <input
                  type="number"
                  value={creditsOffered}
                  onChange={(e) => setCreditsOffered(Number(e.target.value))}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0f2640] mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder="Any special instructions or requirements..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Feeding Schedule
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
                    Walk Schedule
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
                    Medication Instructions
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
                    Sleep Instructions
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
                  Special Warnings
                </label>
                <textarea
                  value={specialWarnings}
                  onChange={(e) => setSpecialWarnings(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  placeholder="Anything critical to avoid or monitor"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || pets.length === 0}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRequest ? 'Update Request' : 'Create Request'}
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
              <h2 className="text-2xl font-bold text-[#0f2640] mb-4">My Requests</h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-[#6b7280]">
                    No requests yet. {pets.length > 0 ? 'Tap "Create Request" to get started.' : 'Add pets first.'}
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
                            <p className="text-xs text-[#6b7280]">(In escrow)</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-[#6b7280]">(In escrow)</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[#6b7280]">Care Type:</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Location:</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Start Date:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.startDate.toLocaleDateString()} at {request.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">End Date:</p>
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

                      {request.status === 'open' && (
                        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                          <p className="text-sm text-[#6b7280] mb-2">
                            Applicants: {request.applications?.length || 0}
                          </p>
                          {!request.applications || request.applications.length === 0 ? (
                            <p className="text-sm text-[#6b7280]">No applications yet.</p>
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
                                    {actioningRequestId === request.id ? 'Processing...' : 'Accept'}
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
                                {actioningRequestId === request.id ? 'Submitting...' : 'Submit Review'}
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
                              {actioningRequestId === request.id ? 'Processing...' : 'Confirm Completion'}
                            </button>
                            <button
                              onClick={() => handleCancelAcceptedRequest(request)}
                              disabled={actioningRequestId === request.id}
                              className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actioningRequestId === request.id ? 'Processing...' : 'Cancel Request'}
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
                              {actioningRequestId === request.id ? 'Processing...' : 'Cancel Request'}
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

            {activeTab === 'community' && (
              <div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
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
                        onClick={() => loadData()}
                        className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[#6b7280]">
                    These are open requests from other pet owners. Your current sitter availability still controls whether you can apply.
                  </p>
                </div>

                {filteredCommunityRequests.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-[#6b7280]">No matching community requests right now.</p>
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
                              <p className="text-[#6b7280]">Credits</p>
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
                              placeholder="Optional message to owner"
                              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          )}

                          {applied ? (
                            <button
                              onClick={() => handleWithdraw(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full border border-gray-400 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? 'Processing...' : 'Withdraw Application'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(request)}
                              disabled={processingCommunityRequestId === request.id}
                              className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                            >
                              {processingCommunityRequestId === request.id ? 'Applying...' : 'Apply to Help'}
                            </button>
                          )}
                          <button
                            onClick={() => handleReportCommunityRequest(request)}
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
            )}

            {activeTab === 'my-sits' && (
              <div>
                <h2 className="text-2xl font-bold text-[#0f2640] mb-4">My Sits</h2>
                {sitterJobs.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-[#6b7280]">
                      You are not assigned to any sits yet. Browse the community requests tab to apply.
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
                            <p className="text-xs text-green-600">(To be earned on completion)</p>
                          )}
                          {request.status === 'awaiting_confirmation' && (
                            <p className="text-xs text-yellow-600">(Awaiting owner confirmation)</p>
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
                          <p className="text-[#6b7280]">Care Type:</p>
                          <p className="text-[#0f2640] font-medium">
                            {getCareTypeLabel(request.careType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Location:</p>
                          <p className="text-[#0f2640] font-medium">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">Start Date:</p>
                          <p className="text-[#0f2640] font-medium">
                            {request.startDate.toLocaleDateString()} at {request.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b7280]">End Date:</p>
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
                            {actioningRequestId === request.id ? 'Processing...' : 'Mark as Complete'}
                          </button>
                          <button
                            onClick={() => handleCancelAcceptedRequest(request)}
                            disabled={actioningRequestId === request.id}
                            className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {actioningRequestId === request.id ? 'Processing...' : 'Cancel Job'}
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
                            {actioningRequestId === request.id ? 'Processing...' : 'Cancel Job'}
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
