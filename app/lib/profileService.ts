import { UserProfile, CreateProfileData, UpdateProfileData } from '@/types/profile';
import { getPilotLocationPayload } from './platformPolicy';
import { syncPublicAvailabilitySummary, syncPublicProfile } from './publicProfileService';
import { mirrorProfileToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { calculateTrustScore, isProfileCompleted } from './trustScore';

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

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function mapProfileRecord(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: (data.uid as string) || uid,
    email: (data.email as string) || '',
    name: (data.name as string) || '',
    location: (data.location as string) || '',
    country: (data.country as string) || 'Finland',
    photoURL: (data.photoURL as string) || '',
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
  const pilotLocation = getPilotLocationPayload();
  const now = new Date();

  await saveProfile({
    uid,
    email,
    name: data.name,
    location: pilotLocation.location,
    country: pilotLocation.country,
    photoURL: '',
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
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
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
  _city: string,
  _country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error(`${USERS_COLLECTION} profile not found`);
  }

  const pilotLocation = getPilotLocationPayload();
  await saveProfile({
    ...profile,
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);

  return {
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
  };
}

export async function updateProfile(uid: string, data: UpdateProfileData): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const pilotLocation = getPilotLocationPayload();
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await saveProfile({
    ...profile,
    ...filteredData,
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: new Date(),
  });

  await recalculateTrustScore(uid);
}

export async function sendPhoneVerificationCode(uid: string, phoneNumber: string): Promise<string> {
  const trimmedPhone = phoneNumber.trim();
  if (!trimmedPhone) {
    throw new Error('Phone number is required');
  }

  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const code = generateSixDigitCode();
  await saveProfile({
    ...profile,
    phoneNumber: trimmedPhone,
    phoneVerified: false,
    phoneVerificationCode: code,
    phoneVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);
  return code;
}

export async function verifyPhoneCode(uid: string, code: string): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const storedCode = profile.phoneVerificationCode || '';
  const expiresAt = profile.phoneVerificationExpires;
  const submittedCode = code.trim();

  if (!storedCode || !expiresAt) {
    throw new Error('No active phone verification code');
  }
  if (expiresAt.getTime() < Date.now()) {
    throw new Error('Phone verification code has expired');
  }
  if (storedCode !== submittedCode) {
    throw new Error('Invalid verification code');
  }

  await saveProfile({
    ...profile,
    phoneVerified: true,
    phoneVerificationCode: undefined,
    phoneVerificationExpires: undefined,
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

  await saveProfile({
    ...profile,
    emailVerified,
    updatedAt: new Date(),
  });
  await recalculateTrustScore(uid);
}

export async function ensurePilotLocation(uid: string): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) {
    return;
  }

  const pilotLocation = getPilotLocationPayload();
  const needsPilotLocation =
    profile.location !== pilotLocation.location ||
    profile.country !== pilotLocation.country ||
    profile.latitude !== pilotLocation.latitude ||
    profile.longitude !== pilotLocation.longitude;

  if (!needsPilotLocation) {
    return;
  }

  await saveProfile({
    ...profile,
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: new Date(),
  });

  await syncPublicProfile(uid);
}
