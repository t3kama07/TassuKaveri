'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { uploadProfileImage } from '@/lib/profileImageService';
import { getWallet } from '@/lib/walletService';
import { AvailabilityStatus, ExperienceLevel, UserProfile } from '@/types/profile';

type ProfileTab = 'details' | 'availability' | 'settings';

const PROFILE_TABS: Array<{ id: ProfileTab; label: string; description: string }> = [
  {
    id: 'details',
    label: 'Personal Details',
    description: 'Your public intro, experience, and care preferences.',
  },
  {
    id: 'availability',
    label: 'Availability Planner',
    description: 'Your actual time slots and booking windows.',
  },
  {
    id: 'settings',
    label: 'Trust & Settings',
    description: 'Verification, account health, and contact details.',
  },
];

const PET_TYPE_OPTIONS = ['dog', 'cat'];
const PET_SIZE_OPTIONS = ['small', 'medium', 'large'];

function toggleArrayValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function sameStringArray(values: string[], otherValues: string[]): boolean {
  if (values.length !== otherValues.length) {
    return false;
  }

  const left = [...values].sort();
  const right = [...otherValues].sort();
  return left.every((value, index) => value === right[index]);
}

function formatOptionLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatList(values: string[], emptyLabel: string): string {
  return values.length > 0 ? values.map(formatOptionLabel).join(', ') : emptyLabel;
}

function formatDateText(date?: Date): string {
  if (!date || Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('details');
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
  const [petTypeExperience, setPetTypeExperience] = useState<string[]>([]);
  const [preferredPetSize, setPreferredPetSize] = useState<string[]>([]);
  const [experienceWithDogs, setExperienceWithDogs] = useState(false);
  const [experienceWithCats, setExperienceWithCats] = useState(false);
  const [experienceWithLargeDogs, setExperienceWithLargeDogs] = useState(false);
  const [experienceWithSeniorPets, setExperienceWithSeniorPets] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneProcessing, setPhoneProcessing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const inputClassName =
    'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-[#0f2640] transition focus:border-[#ff7a2d] focus:outline-none focus:ring-2 focus:ring-[#ffe0cc]';

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [profileData, wallet] = await Promise.all([
        getProfile(user.uid),
        getWallet(user.uid),
      ]);
      setCreditBalance(wallet?.balance ?? 0);
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
        setPetTypeExperience(profileData.petTypeExperience);
        setPreferredPetSize(profileData.preferredPetSize);
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
        petTypeExperience,
        preferredPetSize,
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
      await sendPhoneVerificationCode(user.uid, phoneNumber);
      setSuccess('Verification code sent. Enter it below to confirm your phone number.');
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

  async function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!user || !selectedFile) {
      return;
    }

    setPhotoUploading(true);
    setError('');
    setSuccess('');

    try {
      const uploadedPhotoURL = await uploadProfileImage(user.uid, selectedFile);
      setPhotoURL(uploadedPhotoURL);
      setSuccess('Profile image uploaded. Save changes to update your profile.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to upload profile image: ' + message);
    } finally {
      setPhotoUploading(false);
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
    setPetTypeExperience(profile.petTypeExperience);
    setPreferredPetSize(profile.preferredPetSize);
    setExperienceWithDogs(profile.experienceWithDogs);
    setExperienceWithCats(profile.experienceWithCats);
    setExperienceWithLargeDogs(profile.experienceWithLargeDogs);
    setExperienceWithSeniorPets(profile.experienceWithSeniorPets);
    setPhoneNumber(profile.phoneNumber || '');
    setPhoneCode('');
    setIsEditing(false);
    setError('');
    setSuccess('');
  }

  function handleTabChange(nextTab: ProfileTab) {
    if (nextTab === activeTab) {
      return;
    }

    if (isEditing) {
      if (hasUnsavedChanges) {
        const shouldDiscard = window.confirm(
          'You have unsaved profile changes. Discard them and switch tabs?'
        );

        if (!shouldDiscard) {
          return;
        }
      }

      handleCancel();
    }

    setActiveTab(nextTab);
  }

  const profileComplete = profile ? isProfileCompleted(profile) : false;
  const hasUnsavedChanges = Boolean(
    profile
    && (
      name !== profile.name
      || location !== profile.location
      || country !== profile.country
      || photoURL !== profile.photoURL
      || bio !== profile.bio
      || petExperience !== profile.petExperience
      || availability !== profile.availability
      || latitude !== (profile.latitude !== undefined ? String(profile.latitude) : '')
      || longitude !== (profile.longitude !== undefined ? String(profile.longitude) : '')
      || experienceLevel !== profile.experienceLevel
      || !sameStringArray(petTypeExperience, profile.petTypeExperience)
      || !sameStringArray(preferredPetSize, profile.preferredPetSize)
      || experienceWithDogs !== profile.experienceWithDogs
      || experienceWithCats !== profile.experienceWithCats
      || experienceWithLargeDogs !== profile.experienceWithLargeDogs
      || experienceWithSeniorPets !== profile.experienceWithSeniorPets
    )
  );
  const profileName = profile?.name.trim() || user?.email?.split('@')[0] || 'Your profile';
  const profileLocation = profile ? `${profile.location}, ${profile.country}` : 'Location not added yet';
  const heroBio =
    profile?.bio.trim() || 'Add a short intro so pet owners quickly understand your style.';
  const profileInitial = profileName.charAt(0).toUpperCase();
  const hasCoordinates = latitude.trim() !== '' && longitude.trim() !== '';
  const ratingSummary =
    profile && profile.ratingCount > 0
      ? `${profile.ratingAverage.toFixed(1)} / 5 (${profile.ratingCount} review${profile.ratingCount > 1 ? 's' : ''})`
      : 'No ratings yet';
  const checklistItems = [
    { label: 'Name and location added', done: Boolean(name.trim()) && Boolean(location.trim()) },
    { label: 'Profile photo added', done: Boolean(photoURL.trim()) },
    { label: 'Short bio added', done: Boolean(bio.trim()) },
    { label: 'Pet experience added', done: Boolean(petExperience.trim()) },
    { label: 'Pet types added', done: petTypeExperience.length > 0 },
    { label: 'Phone verified', done: Boolean(profile?.phoneVerified) },
  ];
  const checklistDoneCount = checklistItems.filter((item) => item.done).length;
  const checklistProgress = Math.round((checklistDoneCount / checklistItems.length) * 100);
  const careHighlights = [
    experienceWithDogs ? 'Dog experience' : null,
    experienceWithCats ? 'Cat experience' : null,
    experienceWithLargeDogs ? 'Large dog care' : null,
    experienceWithSeniorPets ? 'Senior pet care' : null,
  ].filter((item): item is string => item !== null);

  function renderDetailsTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0f2640]">Personal Details</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Keep your public profile clear, friendly, and easy to scan.
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[#e5edf6] bg-[#f8fbff] p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">Basic Details</h3>
                <div className="mt-4 rounded-2xl border border-dashed border-[#d7e2ef] bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {photoURL ? (
                      <Image
                        src={photoURL}
                        alt={profileName}
                        width={88}
                        height={88}
                        unoptimized
                        className="h-[88px] w-[88px] rounded-3xl border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-3xl bg-[#0f2640] text-3xl font-bold text-white">
                        {profileInitial}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0f2640]">Profile Photo</p>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        Upload a clear image so your profile feels more personal and trustworthy.
                      </p>

                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading}
                          className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                        >
                          {photoUploading ? 'Uploading...' : photoURL ? 'Replace image' : 'Upload image'}
                        </button>
                        {photoURL && (
                          <button
                            type="button"
                            onClick={() => setPhotoURL('')}
                            disabled={photoUploading}
                            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc] disabled:opacity-50"
                          >
                            Remove image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Location (City)</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5edf6] bg-white p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">About You</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Short Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Pet Experience</label>
                    <textarea
                      value={petExperience}
                      onChange={(e) => setPetExperience(e.target.value)}
                      rows={4}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5edf6] bg-white p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">Care Preferences</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Availability</label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                      className={inputClassName}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className={inputClassName}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#0f2640]">Pet Type Experience</p>
                    <div className="flex flex-wrap gap-2">
                      {PET_TYPE_OPTIONS.map((option) => {
                        const selected = petTypeExperience.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setPetTypeExperience((currentValues) =>
                                toggleArrayValue(currentValues, option)
                              )
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-[#ff7a2d] text-white'
                                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                            }`}
                          >
                            {formatOptionLabel(option)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#0f2640]">Preferred Pet Size</p>
                    <div className="flex flex-wrap gap-2">
                      {PET_SIZE_OPTIONS.map((option) => {
                        const selected = preferredPetSize.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setPreferredPetSize((currentValues) =>
                                toggleArrayValue(currentValues, option)
                              )
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-[#0f2640] text-white'
                                : 'border border-gray-300 bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                            }`}
                          >
                            {formatOptionLabel(option)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithDogs}
                      onChange={(e) => setExperienceWithDogs(e.target.checked)}
                    />
                    Experience with dogs
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithCats}
                      onChange={(e) => setExperienceWithCats(e.target.checked)}
                    />
                    Experience with cats
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithLargeDogs}
                      onChange={(e) => setExperienceWithLargeDogs(e.target.checked)}
                    />
                    Experience with large dogs
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3 text-sm text-[#0f2640]">
                    <input
                      type="checkbox"
                      checked={experienceWithSeniorPets}
                      onChange={(e) => setExperienceWithSeniorPets(e.target.checked)}
                    />
                    Experience with senior pets
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5edf6] bg-[#fcfdff] p-5">
                <h3 className="text-lg font-bold text-[#0f2640]">Optional Map Pin</h3>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Add coordinates only if you want more accurate nearby matching.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0f2640]">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-5">
              {profile.photoURL && (
                <Image
                  src={profile.photoURL}
                  alt={profile.name}
                  width={88}
                  height={88}
                  unoptimized
                  className="h-[88px] w-[88px] rounded-3xl border border-gray-200 object-cover"
                />
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Name</p>
                  <p className="mt-1 text-sm text-[#516173]">{profile.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Location</p>
                  <p className="mt-1 text-sm text-[#516173]">{profile.location}, {profile.country}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Availability</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {profile.availability === 'available' ? 'Open for bookings' : 'Bookings paused'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Experience level</p>
                  <p className="mt-1 text-sm capitalize text-[#516173]">{profile.experienceLevel}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Pet types</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {formatList(petTypeExperience, 'Not specified yet')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f2640]">Preferred sizes</p>
                  <p className="mt-1 text-sm text-[#516173]">
                    {formatList(preferredPetSize, 'Not specified yet')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8fbff] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">About You</p>
                <p className="mt-2 text-sm text-[#516173]">{profile.bio || 'No bio added yet.'}</p>
              </div>

              <div className="rounded-2xl bg-[#fffaf6] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">Pet Experience</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {profile.petExperience || 'No pet care notes added yet.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Care Highlights</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {careHighlights.length > 0 ? (
                    careHighlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-sm font-medium text-[#4b5563]">
                      Add highlights while editing your profile.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0f2640]">Profile Checklist</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Small wins that make the profile easier to trust.
                </p>
              </div>
              <p className="text-sm font-semibold text-[#0f2640]">
                {checklistDoneCount}/{checklistItems.length}
              </p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#eef2ff]">
              <div
                className="h-2 rounded-full bg-[#ff7a2d] transition-all"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <div className="mt-5 space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[#fcfdff] px-4 py-3"
                >
                  <p className="text-sm text-[#0f2640]">{item.label}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.done ? 'bg-[#ecfdf3] text-[#047857]' : 'bg-[#fff7ed] text-[#c2410c]'
                    }`}
                  >
                    {item.done ? 'Done' : 'To do'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderAvailabilityTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f2640]">Availability Planner</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Add the times when you are open to pet care requests.
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-[#f8fbff] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">Current booking status</p>
                <p className="mt-2 text-sm text-[#516173]">
                  {availability === 'available'
                    ? 'Your profile is open for new booking requests.'
                    : 'Your profile is currently paused. Turn it back on from Personal Details when ready.'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fffaf6] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">Recommended setup</p>
                <p className="mt-2 text-sm text-[#516173]">
                  Add your next few open windows so owners can request help faster without too much back and forth.
                </p>
              </div>

            </div>
          </div>
        </div>

        <AvailabilityPlanner userId={profile.uid} />
      </section>
    );
  }

  function renderSettingsTab() {
    if (!profile) {
      return null;
    }

    return (
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0f2640]">Trust & Settings</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Keep your account easy to trust and easy to reach.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-4">
              <p className="text-sm text-[#6b7280]">Email status</p>
              <p className="mt-2 text-lg font-bold text-[#0f2640]">
                {profile.emailVerified ? 'Verified' : 'Pending'}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">{profile.email}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#fcfdff] p-4">
              <p className="text-sm text-[#6b7280]">Phone status</p>
              <p className="mt-2 text-lg font-bold text-[#0f2640]">
                {profile.phoneVerified ? 'Verified' : phoneNumber.trim() ? 'Code pending' : 'Not added'}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                {phoneNumber.trim() || 'Add a mobile number for verification'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#e5edf6] bg-[#f8fbff] p-5">
            <h3 className="text-lg font-bold text-[#0f2640]">Phone Verification</h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Use a number pet owners can reach if plans change quickly.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+358401234567"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={handleSendPhoneCode}
                disabled={phoneProcessing}
                className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc] disabled:opacity-50"
              >
                Send Code
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="Enter code"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={handleVerifyPhoneCode}
                disabled={phoneProcessing}
                className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f] disabled:opacity-50"
              >
                Verify Code
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f2640]">Account Overview</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Useful details to keep handy.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Credits balance</p>
                <p className="mt-1 text-sm text-[#516173]">{creditBalance} credits</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Role</p>
                <p className="mt-1 text-sm text-[#516173]">{profile.role === 'admin' ? 'Admin' : 'Member'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Member since</p>
                <p className="mt-1 text-sm text-[#516173]">{formatDateText(profile.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Last updated</p>
                <p className="mt-1 text-sm text-[#516173]">{formatDateText(profile.updatedAt)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Map precision</p>
                <p className="mt-1 text-sm text-[#516173]">
                  {hasCoordinates ? 'Exact coordinates set' : 'Using city-level location'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Trust score</p>
                <p className="mt-1 text-sm text-[#516173]">{profile.trustScore}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2640]">Rating</p>
                <p className="mt-1 text-sm text-[#516173]">{ratingSummary}</p>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-300 bg-[#fafafa] p-4">
                <p className="text-sm font-semibold text-[#0f2640]">Best next step</p>
                <p className="mt-2 text-sm text-[#516173]">
                  Finish your key details, verify your phone, and keep a few upcoming slots in the planner for the strongest first impression.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-[#6b7280]">Loading profile...</p>
          </div>
        ) : !profile ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <p className="text-red-700">Profile not found. Please contact support.</p>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_42%,#eef5ff_100%)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">
                    My Profile
                  </p>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                    {profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profileName}
                        width={96}
                        height={96}
                        unoptimized
                        className="h-24 w-24 rounded-3xl border border-white/80 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#0f2640] text-3xl font-bold text-white shadow-sm">
                        {profileInitial}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h1 className="text-3xl font-bold text-[#0f2640] sm:text-4xl">
                        {profileName}
                      </h1>
                      <p className="mt-2 text-base text-[#516173]">{profileLocation}</p>
                      <p className="mt-4 max-w-3xl text-[#516173]">{heroBio}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('details');
                        setIsEditing(true);
                      }}
                      className="rounded-full bg-[#ff7a2d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
                    >
                      {profileComplete ? 'Edit profile' : 'Finish profile'}
                    </button>
                    <p className="text-sm text-[#6b7280]">
                      Use the tabs below to manage availability and settings.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-medium text-[#0f2640]">
                      {profile.availability === 'available' ? 'Open for bookings' : 'Bookings paused'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profile.phoneVerified ? 'bg-[#ecfdf3] text-[#047857]' : 'bg-[#f3f4f6] text-[#4b5563]'
                      }`}
                    >
                      {profile.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profileComplete ? 'bg-[#ecfdf3] text-[#047857]' : 'bg-[#fff7ed] text-[#c2410c]'
                      }`}
                    >
                      {profileComplete ? 'Profile complete' : 'Profile needs attention'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profile.emailVerified ? 'bg-[#eef5ff] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#4b5563]'
                      }`}
                    >
                      {profile.emailVerified ? 'Email verified' : 'Email not verified'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Profile status</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {profileComplete ? 'Ready' : 'In progress'}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profileComplete ? 'You look ready for matching.' : 'A few details still need attention.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Credits</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{creditBalance}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">Available for upcoming exchanges.</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Trust score</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">{profile.trustScore}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {profile.phoneVerified ? 'Phone verified and visible.' : 'Verify your phone to strengthen trust.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                    <p className="text-sm text-[#6b7280]">Rating</p>
                    <p className="mt-2 text-3xl font-bold text-[#0f2640]">
                      {profile.ratingCount > 0 ? profile.ratingAverage.toFixed(1) : 'New'}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">{ratingSummary}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
              <div className="grid gap-2 md:grid-cols-3">
                {PROFILE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`h-full rounded-2xl px-4 py-4 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#0f2640] text-white'
                        : 'bg-white text-[#0f2640] hover:bg-[#f7fafc]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{tab.label}</span>
                    <span
                      className={`mt-1 block text-xs ${
                        activeTab === tab.id ? 'text-white/80' : 'text-[#6b7280]'
                      }`}
                    >
                      {tab.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'availability' && renderAvailabilityTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
