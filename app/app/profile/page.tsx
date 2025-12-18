'use client';

import { useState, useEffect, FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/profileService';
import { UserProfile, UserRole } from '@/types/profile';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState<UserRole>('owner');

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      setLoading(true);
      const profileData = await getProfile(user.uid);
      if (profileData) {
        setProfile(profileData);
        setName(profileData.name);
        setLocation(profileData.location);
        setRole(profileData.role);
      }
    } catch (err: any) {
      setError('Failed to load profile: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await updateProfile(user.uid, { name, location, role });
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await loadProfile();
    } catch (err: any) {
      setError('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (profile) {
      setName(profile.name);
      setLocation(profile.location);
      setRole(profile.role);
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  }

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Profile</h1>

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

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading profile...</p>
          </div>
        ) : !profile ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-red-700">Profile not found. Please contact support.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  />
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
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
                  >
                    <option value="owner">Pet Owner</option>
                    <option value="sitter">Pet Sitter</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
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
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#6b7280] mb-1">
                    Name
                  </label>
                  <p className="text-[#0f2640] font-medium">{profile.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b7280] mb-1">
                    Location
                  </label>
                  <p className="text-[#0f2640] font-medium">{profile.location}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b7280] mb-1">
                    Role
                  </label>
                  <p className="text-[#0f2640] font-medium">
                    {profile.role === 'owner' && 'Pet Owner'}
                    {profile.role === 'sitter' && 'Pet Sitter'}
                    {profile.role === 'both' && 'Both'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b7280] mb-1">
                    Email
                  </label>
                  <p className="text-[#0f2640] font-medium">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b7280] mb-1">
                    Member Since
                  </label>
                  <p className="text-[#0f2640] font-medium">
                    {profile.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
