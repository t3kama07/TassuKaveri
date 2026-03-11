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

export function isProfileCompleted(profile: UserProfile): boolean {
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

async function geocodeCityCountry(
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const cityValue = city.trim();
  const countryValue = country.trim();
  if (!cityValue) {
    return null;
  }

  const searchParams = new URLSearchParams({
    format: 'json',
    limit: '1',
    city: cityValue,
    country: countryValue || 'Finland',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const latitude = Number(payload[0].lat);
  const longitude = Number(payload[0].lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
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
  await setDoc(profileRef, {
    uid,
    email,
    name: data.name,
    location: data.location,
    country: data.country || 'Finland',
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
    ratingAverage: 0,
    ratingCount: 0,
    trustScore: 0,
    role: 'user',
    frozen: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const geocoded = await geocodeCityCountry(city, country);
  const profileRef = doc(db, USERS_COLLECTION, uid);

  if (!geocoded) {
    await updateDoc(profileRef, {
      location: city,
      country,
      updatedAt: serverTimestamp(),
    });
    return null;
  }

  await updateDoc(profileRef, {
    location: city,
    country,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    updatedAt: serverTimestamp(),
  });

  return geocoded;
}

/**
 * Update a user profile in Firestore
 */
export async function updateProfile(uid: string, data: UpdateProfileData): Promise<void> {
  const profileRef = doc(db, USERS_COLLECTION, uid);
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await updateDoc(profileRef, {
    ...filteredData,
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
