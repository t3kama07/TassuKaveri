'use client';

import { useState, useEffect, FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRequests, createRequest, updateRequest, cancelRequest, deleteRequest } from '@/lib/requestService';
import { getUserPets } from '@/lib/petService';
import { Request, CreateRequestData, CareType } from '@/types/request';
import { Pet } from '@/types/pet';

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const [userRequests, userPets] = await Promise.all([
        getUserRequests(user.uid),
        getUserPets(user.uid),
      ]);
      setRequests(userRequests);
      setPets(userPets);
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
      case 'completed':
        return 'text-gray-600 bg-gray-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640]">My Requests</h1>
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

        {pets.length === 0 && !loading && (
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
                {pets.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No pets available. Add pets first.</p>
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
        ) : requests.length === 0 ? (
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
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-[#ff7a2d]">{request.creditsOffered} credits</p>
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

                {request.sitterName && (
                  <div className="mb-4">
                    <p className="text-sm text-[#6b7280]">Sitter:</p>
                    <p className="text-sm text-[#0f2640] font-medium">{request.sitterName}</p>
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
                        Cancel Request
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
    </ProtectedRoute>
  );
}
