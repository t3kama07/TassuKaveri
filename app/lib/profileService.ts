import { UserProfile, CreateProfileData, UpdateProfileData } from '@/types/profile';
import { getCityLocationPayload } from './locations';
import { PILOT_CITY } from './platformPolicy';
import { syncPublicAvailabilitySummary, syncPublicProfile } from './publicProfileService';
import { mirrorProfileToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { getAutomaticProfileAvatarUrl, resolveProfileAvatarUrl } from './profileAvatar';
import { calculateTrustScore } from './trustScore';

const USERS_COLLECTION = 'users';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

function mapProfileRecord(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: (data.uid as string) || uid,
    email: (data.email as string) || '',
    name: (data.name as string) || '',
    location: (data.location as string) || '',
    country: (data.country as string) || 'Finland',
    photoURL: resolveProfileAvatarUrl(data.photoURL as string | undefined, uid),
    bio: (data.bio as string) || '',
    petExperience: (data.petExperience as string) || '',
    availability: ((data.availability as UserProfile['availability']) || 'available'),
    emailVerified: Boolean(data.emailVerified),
    phoneNumber: (data.phoneNumber as string) || '',
    phoneVerified: Boolean(data.phoneVerified),
    phoneVerificationCode: (data.phoneVerificationCode as string) || undefined,
    phoneVerificationExpires: asDate(data.phoneVerificationExpires),
    petTypeExperience: Array.isArray(data.petTypeExperience) ? data.petTypeExperience : [],
    preferredPetSize: Array.isArray(data.preferredPetSize) ? data.preferredPetSize : [],
    experienceLevel: (data.experienceLevel as UserProfile['experienceLevel']) || 'beginner',
    experienceWithDogs: Boolean(data.experienceWithDogs),
    experienceWithCats: Boolean(data.experienceWithCats),
    experienceWithLargeDogs: Boolean(data.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(data.experienceWithSeniorPets),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    ratingAverage: asNumber(data.ratingAverage) || 0,
    ratingCount: asNumber(data.ratingCount) || 0,
    trustScore: asNumber(data.trustScore) || 0,
    role: (data.role as UserProfile['role']) || 'user',
    frozen: Boolean(data.frozen),
    createdAt: asDate(data.createdAt) || new Date(),
    updatedAt: asDate(data.updatedAt) || new Date(),
  };
}

async function saveProfile(profile: UserProfile): Promise<void> {
  await mirrorProfileToSupabase(profile);
}

async function fetchCompletedSitsCount(userId: string): Promise<number> {
  const payload = await fetchSupabaseReadJson<{ completedCount: number }>(
    `/api/supabase-read/request?scope=completed-count&sitterId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return typeof payload.completedCount === 'number' ? payload.completedCount : 0;
}

async function getProfileRecord(uid: string): Promise<Record<string, unknown> | null> {
  const payload = await fetchSupabaseReadJson<{ profile: Record<string, unknown> | null }>(
    `/api/supabase-read/profile?uid=${encodeURIComponent(uid)}`,
    { requireAuth: true }
  );

  return payload.profile;
}

export { calculateTrustScore, isProfileCompleted } from './trustScore';

export async function createProfile(
  uid: string,
  email: string,
  data: CreateProfileData
): Promise<void> {
  const selectedLocation =
    getCityLocationPayload(data.location) ?? getCityLocationPayload(PILOT_CITY)!;
  const now = new Date();

  await saveProfile({
    uid,
    email,
    name: data.name,
    location: selectedLocation.location,
    country: selectedLocation.country,
    photoURL: getAutomaticProfileAvatarUrl(uid),
    bio: '',
    petExperience: '',
    availability: 'available',
    emailVerified: false,
    phoneNumber: '',
    phoneVerified: false,
    petTypeExperience: [],
    preferredPetSize: [],
    experienceLevel: 'beginner',
    experienceWithDogs: false,
    experienceWithCats: false,
    experienceWithLargeDogs: false,
    experienceWithSeniorPets: false,
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    ratingAverage: 0,
    ratingCount: 0,
    trustScore: 0,
    role: 'user',
    frozen: false,
    createdAt: now,
    updatedAt: now,
  });

  await syncPublicProfile(uid);
  await syncPublicAvailabilitySummary(uid, []);
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const profileRecord = await getProfileRecord(uid);
  return profileRecord ? mapProfileRecord(uid, profileRecord) : null;
}

export async function updateUserLocation(
  uid: string,
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error(`${USERS_COLLECTION} profile not found`);
  }

  const selectedLocation = getCityLocationPayload(city);
  if (!selectedLocation) {
    throw new Error('Select a supported Finnish city');
  }

  await saveProfile({
    ...profile,
    location: selectedLocation.location,
    country: selectedLocation.country,
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);

  return {
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
  };
}

export async function updateProfile(uid: string, data: UpdateProfileData): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await saveProfile({
    ...profile,
    ...filteredData,
    updatedAt: new Date(),
  });

  await recalculateTrustScore(uid);
}

export async function recalculateTrustScore(uid: string): Promise<number> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const completedSits = await fetchCompletedSitsCount(uid);
  const trustScore = calculateTrustScore(profile, completedSits);

  await saveProfile({
    ...profile,
    trustScore,
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);
  return trustScore;
}

export async function profileExists(uid: string): Promise<boolean> {
  const payload = await fetchSupabaseReadJson<{ profile: Record<string, unknown> | null }>(
    `/api/supabase-read/profile?uid=${encodeURIComponent(uid)}`,
    { requireAuth: true }
  );

  return Boolean(payload.profile);
}

export async function setEmailVerifiedStatus(uid: string, emailVerified: boolean): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  if (profile.emailVerified === emailVerified) {
    return;
  }

  await saveProfile({
    ...profile,
    emailVerified,
    updatedAt: new Date(),
  });
  await recalculateTrustScore(uid);
}

export async function setProfileEmailVerifiedStatus(
  profile: UserProfile,
  emailVerified: boolean
): Promise<UserProfile> {
  if (profile.emailVerified === emailVerified) {
    return profile;
  }

  const nextProfile = {
    ...profile,
    emailVerified,
    updatedAt: new Date(),
  };

  await saveProfile(nextProfile);
  await recalculateTrustScore(profile.uid);
  return nextProfile;
}

export async function ensureSupportedLocation(uid: string): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    return;
  }

  const selectedLocation = getCityLocationPayload(profile.location);
  if (!selectedLocation) {
    return;
  }

  const needsPilotLocation =
    profile.location !== selectedLocation.location ||
    profile.country !== selectedLocation.country ||
    profile.latitude !== selectedLocation.latitude ||
    profile.longitude !== selectedLocation.longitude;

  if (!needsPilotLocation) {
    return;
  }

  await saveProfile({
    ...profile,
    location: selectedLocation.location,
    country: selectedLocation.country,
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);
}

export async function ensureProfileSupportedLocation(profile: UserProfile): Promise<UserProfile> {
  const selectedLocation = getCityLocationPayload(profile.location);
  if (!selectedLocation) {
    return profile;
  }

  const needsPilotLocation =
    profile.location !== selectedLocation.location ||
    profile.country !== selectedLocation.country ||
    profile.latitude !== selectedLocation.latitude ||
    profile.longitude !== selectedLocation.longitude;

  if (!needsPilotLocation) {
    return profile;
  }

  const nextProfile = {
    ...profile,
    location: selectedLocation.location,
    country: selectedLocation.country,
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    updatedAt: new Date(),
  };

  await saveProfile(nextProfile);
  await syncPublicProfile(profile.uid);
  return nextProfile;
}
