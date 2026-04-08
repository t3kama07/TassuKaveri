import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, CreateProfileData, UpdateProfileData } from '@/types/profile';
import { getPilotLocationPayload } from './platformPolicy';
import { syncPublicAvailabilitySummary, syncPublicProfile } from './publicProfileService';

const USERS_COLLECTION = 'users';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isProfileCompleted(
  profile: Pick<UserProfile, 'name' | 'location' | 'bio' | 'petExperience' | 'photoURL'>
): boolean {
  return Boolean(
    profile.name.trim() &&
      profile.location.trim() &&
      profile.bio.trim() &&
      profile.petExperience.trim() &&
      profile.photoURL.trim()
  );
}

export function calculateTrustScore(profile: UserProfile, completedSits: number): number {
  let score = 0;

  if (isProfileCompleted(profile)) {
    score += 20;
  }
  if (profile.phoneVerified) {
    score += 20;
  }
  if (profile.emailVerified) {
    score += 10;
  }
  score += Math.max(0, completedSits) * 3;
  if (profile.ratingAverage > 4.5) {
    score += 10;
  }

  return Math.min(score, 100);
}

async function getCompletedSitsCount(userId: string): Promise<number> {
  const sitsQuery = query(collectionGroup(db, 'requests'), where('sitterId', '==', userId));
  const sitsSnapshot = await getDocs(sitsQuery);
  let completedCount = 0;

  sitsSnapshot.forEach((requestDoc) => {
    const data = requestDoc.data();
    if (data.status === 'completed') {
      completedCount += 1;
    }
  });

  return completedCount;
}

/**
 * Create a new user profile in Firestore
 */
export async function createProfile(
  uid: string,
  email: string,
  data: CreateProfileData
): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const pilotLocation = getPilotLocationPayload();
  await setDoc(profileRef, {
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await syncPublicProfile(uid);
  await syncPublicAvailabilitySummary(uid, []);
}

/**
 * Get a user profile from Firestore
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    return null;
  }

  const data = profileSnap.data();
  return {
    uid: data.uid,
    email: data.email,
    name: data.name || '',
    location: data.location || '',
    country: data.country || 'Finland',
    photoURL: data.photoURL || '',
    bio: data.bio || '',
    petExperience: data.petExperience || '',
    availability: data.availability || 'available',
    emailVerified: Boolean(data.emailVerified),
    phoneNumber: data.phoneNumber || '',
    phoneVerified: Boolean(data.phoneVerified),
    phoneVerificationCode: data.phoneVerificationCode || undefined,
    phoneVerificationExpires: asDate(data.phoneVerificationExpires),
    petTypeExperience: Array.isArray(data.petTypeExperience) ? data.petTypeExperience : [],
    preferredPetSize: Array.isArray(data.preferredPetSize) ? data.preferredPetSize : [],
    experienceLevel: data.experienceLevel || 'beginner',
    experienceWithDogs: Boolean(data.experienceWithDogs),
    experienceWithCats: Boolean(data.experienceWithCats),
    experienceWithLargeDogs: Boolean(data.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(data.experienceWithSeniorPets),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    ratingAverage: asNumber(data.ratingAverage) || 0,
    ratingCount: asNumber(data.ratingCount) || 0,
    trustScore: asNumber(data.trustScore) || 0,
    role: data.role || 'user',
    frozen: Boolean(data.frozen),
    createdAt: asDate(data.createdAt) || new Date(),
    updatedAt: asDate(data.updatedAt) || new Date(),
  };
}

/**
 * Update user location with geocoded coordinates
 */
export async function updateUserLocation(
  uid: string,
  _city: string,
  _country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const pilotLocation = getPilotLocationPayload();

  await updateDoc(profileRef, {
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: serverTimestamp(),
  });
  await syncPublicProfile(uid);

  return {
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
  };
}

/**
 * Update a user profile in Firestore
 */
export async function updateProfile(uid: string, data: UpdateProfileData): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  const pilotLocation = getPilotLocationPayload();

  await updateDoc(profileRef, {
    ...filteredData,
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: serverTimestamp(),
  });

  await recalculateTrustScore(uid);
}

/**
 * Generate and store phone verification code with 10 minute expiry.
 */
export async function sendPhoneVerificationCode(uid: string, phoneNumber: string): Promise<string> {
  const trimmedPhone = phoneNumber.trim();
  if (!trimmedPhone) {
    throw new Error('Phone number is required');
  }

  const profileRef = doc(db, USERS_COLLECTION, uid);
  const code = generateSixDigitCode();
  const expiry = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

  await updateDoc(profileRef, {
    phoneNumber: trimmedPhone,
    phoneVerified: false,
    phoneVerificationCode: code,
    phoneVerificationExpires: expiry,
    updatedAt: serverTimestamp(),
  });

  await syncPublicProfile(uid);

  return code;
}

/**
 * Verify stored phone code and mark profile as phone verified.
 */
export async function verifyPhoneCode(uid: string, code: string): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    throw new Error('Profile not found');
  }

  const data = profileSnap.data();
  const storedCode = (data.phoneVerificationCode as string) || '';
  const expiresAt = asDate(data.phoneVerificationExpires);
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

  await updateDoc(profileRef, {
    phoneVerified: true,
    phoneVerificationCode: null,
    phoneVerificationExpires: null,
    updatedAt: serverTimestamp(),
  });

  await recalculateTrustScore(uid);
}

/**
 * Recalculate and persist trust score.
 */
export async function recalculateTrustScore(uid: string): Promise<number> {
  const profile = await getProfile(uid);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const completedSits = await getCompletedSitsCount(uid);
  const trustScore = calculateTrustScore(profile, completedSits);

  const profileRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(profileRef, {
    trustScore,
    updatedAt: serverTimestamp(),
  });

  await syncPublicProfile(uid);

  return trustScore;
}

/**
 * Check if a profile exists
 */
export async function profileExists(uid: string): Promise<boolean> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists();
}

/**
 * Keep profile verification badge in sync with Firebase Auth email verification.
 */
export async function setEmailVerifiedStatus(uid: string, emailVerified: boolean): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(profileRef, {
    emailVerified,
    updatedAt: serverTimestamp(),
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

  const profileRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(profileRef, {
    location: pilotLocation.location,
    country: pilotLocation.country,
    latitude: pilotLocation.latitude,
    longitude: pilotLocation.longitude,
    updatedAt: serverTimestamp(),
  });

  await syncPublicProfile(uid);
}
