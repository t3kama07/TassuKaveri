'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AvailabilityPlanner from '@/components/AvailabilityPlanner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProfile,
  isProfileCompleted,
  sendPhoneVerificationCode,
  updateProfile,
  updateUserLocation,
  verifyPhoneCode,
} from '@/lib/profileService';
import { AvailabilityStatus, ExperienceLevel, UserProfile } from '@/types/profile';

function toCsv(values: string[]): string {
  return values.join(', ');
}

function fromCsv(csv: string): string[] {
  return csv
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('Finland');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [petExperience, setPetExperience] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [petTypeExperienceCsv, setPetTypeExperienceCsv] = useState('');
  const [preferredPetSizeCsv, setPreferredPetSizeCsv] = useState('');
  const [experienceWithDogs, setExperienceWithDogs] = useState(false);
  const [experienceWithCats, setExperienceWithCats] = useState(false);
  const [experienceWithLargeDogs, setExperienceWithLargeDogs] = useState(false);
  const [experienceWithSeniorPets, setExperienceWithSeniorPets] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneProcessing, setPhoneProcessing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const profileData = await getProfile(user.uid);
      if (profileData) {
        setProfile(profileData);
        setName(profileData.name);
        setLocation(profileData.location);
        setCountry(profileData.country);
        setPhotoURL(profileData.photoURL);
        setBio(profileData.bio);
        setPetExperience(profileData.petExperience);
        setAvailability(profileData.availability);
        setLatitude(profileData.latitude !== undefined ? String(profileData.latitude) : '');
        setLongitude(profileData.longitude !== undefined ? String(profileData.longitude) : '');
        setExperienceLevel(profileData.experienceLevel);
        setPetTypeExperienceCsv(toCsv(profileData.petTypeExperience));
        setPreferredPetSizeCsv(toCsv(profileData.preferredPetSize));
        setExperienceWithDogs(profileData.experienceWithDogs);
        setExperienceWithCats(profileData.experienceWithCats);
        setExperienceWithLargeDogs(profileData.experienceWithLargeDogs);
        setExperienceWithSeniorPets(profileData.experienceWithSeniorPets);
        setPhoneNumber(profileData.phoneNumber || '');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load profile: ' + message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const parsedLat = latitude.trim() === '' ? undefined : Number(latitude);
      const parsedLng = longitude.trim() === '' ? undefined : Number(longitude);

      if (parsedLat !== undefined && (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (parsedLng !== undefined && (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }

      await updateProfile(user.uid, {
        name,
        location,
        country,
        photoURL,
        bio,
        petExperience,
        availability,
        latitude: parsedLat,
        longitude: parsedLng,
        experienceLevel,
        petTypeExperience: fromCsv(petTypeExperienceCsv),
        preferredPetSize: fromCsv(preferredPetSizeCsv),
        experienceWithDogs,
        experienceWithCats,
        experienceWithLargeDogs,
        experienceWithSeniorPets,
      });

      if (parsedLat === undefined || parsedLng === undefined) {
        await updateUserLocation(user.uid, location, country);
      }

      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await loadProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to update profile: ' + message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPhoneCode() {
    if (!user) return;
    setPhoneProcessing(true);
    setError('');
    setSuccess('');

    try {
      const generatedCode = await sendPhoneVerificationCode(user.uid, phoneNumber);
      setSuccess(`Phone verification code generated: ${generatedCode}`);
      await loadProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to send phone verification code: ' + message);
    } finally {
      setPhoneProcessing(false);
    }
  }

  async function handleVerifyPhoneCode() {
    if (!user) return;
    setPhoneProcessing(true);
    setError('');
    setSuccess('');

    try {
      await verifyPhoneCode(user.uid, phoneCode);
      setSuccess('Phone number verified successfully.');
      setPhoneCode('');
      await loadProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to verify phone code: ' + message);
    } finally {
      setPhoneProcessing(false);
    }
  }

  function handleCancel() {
    if (!profile) return;
    setName(profile.name);
    setLocation(profile.location);
    setCountry(profile.country);
    setPhotoURL(profile.photoURL);
    setBio(profile.bio);
    setPetExperience(profile.petExperience);
    setAvailability(profile.availability);
    setLatitude(profile.latitude !== undefined ? String(profile.latitude) : '');
    setLongitude(profile.longitude !== undefined ? String(profile.longitude) : '');
    setExperienceLevel(profile.experienceLevel);
    setPetTypeExperienceCsv(toCsv(profile.petTypeExperience));
    setPreferredPetSizeCsv(toCsv(profile.preferredPetSize));
    setExperienceWithDogs(profile.experienceWithDogs);
    setExperienceWithCats(profile.experienceWithCats);
    setExperienceWithLargeDogs(profile.experienceWithLargeDogs);
    setExperienceWithSeniorPets(profile.experienceWithSeniorPets);
    setPhoneNumber(profile.phoneNumber || '');
    setIsEditing(false);
    setError('');
    setSuccess('');
  }

  const profileComplete = profile ? isProfileCompleted(profile) : false;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    profile.availability === 'available'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {profile.availability === 'available' ? 'Open for bookings' : 'Bookings paused'}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    profile.phoneVerified ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {profile.phoneVerified ? 'Phone Verified' : 'Phone Not Verified'}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    profileComplete ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {profileComplete ? 'Profile Completed' : 'Profile Incomplete'}
                </span>
              </div>

              <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-[#0f2640] mb-2">Phone Verification</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+358401234567"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleSendPhoneCode}
                    disabled={phoneProcessing}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Send Code
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="Enter code"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleVerifyPhoneCode}
                    disabled={phoneProcessing}
                    className="px-3 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] text-sm"
                  >
                    Verify Code
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Location (City)</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">Profile Photo URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">Short Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">Pet Experience</label>
                  <textarea
                    value={petExperience}
                    onChange={(e) => setPetExperience(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Availability</label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2640] mb-1">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Pet Type Experience (comma separated, e.g. dog, cat)
                  </label>
                  <input
                    type="text"
                    value={petTypeExperienceCsv}
                    onChange={(e) => setPetTypeExperienceCsv(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0f2640] mb-1">
                    Preferred Pet Size (comma separated, e.g. small, medium, large)
                  </label>
                  <input
                    type="text"
                    value={preferredPetSizeCsv}
                    onChange={(e) => setPreferredPetSizeCsv(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={experienceWithDogs}
                      onChange={(e) => setExperienceWithDogs(e.target.checked)}
                    />
                    Experience with dogs
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={experienceWithCats}
                      onChange={(e) => setExperienceWithCats(e.target.checked)}
                    />
                    Experience with cats
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={experienceWithLargeDogs}
                      onChange={(e) => setExperienceWithLargeDogs(e.target.checked)}
                    />
                    Experience with large dogs
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={experienceWithSeniorPets}
                      onChange={(e) => setExperienceWithSeniorPets(e.target.checked)}
                    />
                    Experience with senior pets
                  </label>
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
                  {profile.photoURL && (
                    <Image
                      src={profile.photoURL}
                      alt={profile.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="w-20 h-20 rounded-full object-cover border border-gray-200"
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#6b7280] mb-1">Name</label>
                    <p className="text-[#0f2640] font-medium">{profile.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6b7280] mb-1">Location</label>
                    <p className="text-[#0f2640] font-medium">
                      {profile.location}, {profile.country}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6b7280] mb-1">Phone</label>
                    <p className="text-[#0f2640] font-medium">{profile.phoneNumber || 'Not set'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6b7280] mb-1">Trust Score</label>
                    <p className="text-[#0f2640] font-medium">{profile.trustScore}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6b7280] mb-1">Average Rating</label>
                    <p className="text-[#0f2640] font-medium">
                      {profile.ratingCount > 0
                        ? `${profile.ratingAverage.toFixed(1)} / 5 (${profile.ratingCount} review${profile.ratingCount > 1 ? 's' : ''})`
                        : 'No ratings yet'}
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

            <AvailabilityPlanner
              userId={profile.uid}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
