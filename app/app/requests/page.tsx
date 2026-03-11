'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserRequests,
  getSitterRequests,
  createRequest,
  updateRequest,
  cancelRequest,
  deleteRequest,
  cancelAcceptedRequest,
  markAwaitingConfirmation,
  confirmCompletion,
  acceptApplication,
  submitReview,
} from '@/lib/requestService';
import { getUserPets } from '@/lib/petService';
import { Request, CreateRequestData, CareType, RequestApplication } from '@/types/request';
import { Pet } from '@/types/pet';

export default function RequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [sitterJobs, setSitterJobs] = useState<Request[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

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

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const [userRequests, userPets, sitterRequests] = await Promise.all([
        getUserRequests(user.uid),
        getUserPets(user.uid),
        getSitterRequests(user.uid),
      ]);
      setRequests(userRequests);
      setPets(userPets);
      setSitterJobs(sitterRequests);
    } catch (err: any) {
      setError('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function handleAddNew() {
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
      await loadData();
    } catch (err: any) {
      setError('Failed to save request: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to cancel request: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to delete request: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to mark as completed: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to confirm completion: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to cancel request: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to accept applicant: ' + (err.message || 'Unknown error'));
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
    } catch (err: any) {
      setError('Failed to submit review: ' + (err.message || 'Unknown error'));
    } finally {
      setActioningRequestId(null);
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
        return 'OPEN';
      case 'accepted':
        return 'ACCEPTED';
      case 'awaiting_confirmation':
        return 'AWAITING CONFIRMATION';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return status.toUpperCase();
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0f2640]">My Requests</h1>
            <p className="text-sm text-[#6b7280] mt-1">
              Looking for a sitter? <Link href="/requests/browse" className="text-[#ff7a2d] hover:underline">Browse requests</Link> from other pet owners
            </p>
          </div>
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
            >
              Create Request
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {pets.length === 0 && !loading && !showForm && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
            You need to add pets before creating requests. Go to the Pets page first.
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#0f2640] mb-4">
              {editingRequest ? 'Edit Request' : 'Create New Request'}
            </h2>
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
            {/* My Requests (as owner) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0f2640] mb-4">My Requests</h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-[#6b7280]">
                    No requests yet. {pets.length > 0 ? 'Click "Create Request" to get started.' : 'Add pets first.'}
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
                            {request.careType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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

            {/* Jobs I'm helping with (as sitter) */}
            {sitterJobs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-[#0f2640] mb-4">Jobs I'm Helping With</h2>
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
                            {request.careType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
