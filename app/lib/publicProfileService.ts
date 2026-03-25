import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { AvailabilitySlot } from '@/types/availability';
import { PublicUserProfile } from '@/types/profile';

const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function hasToDate(value: unknown): value is { toDate: () => Date } {
  return Boolean(value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function');
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (hasToDate(value)) {
    return value.toDate();
  }
  return undefined;
}

function getPublicProfileRef(uid: string) {
  return doc(db, PUBLIC_PROFILES_COLLECTION, uid);
}

export function buildPublicProfileDocument(
  uid: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    uid,
    name: (data.name as string) || '',
    location: (data.location as string) || '',
    country: (data.country as string) || 'Finland',
    photoURL: (data.photoURL as string) || '',
    bio: (data.bio as string) || '',
    petExperience: (data.petExperience as string) || '',
    availability: (data.availability as string) || 'available',
    phoneVerified: Boolean(data.phoneVerified),
    petTypeExperience: Array.isArray(data.petTypeExperience) ? data.petTypeExperience : [],
    preferredPetSize: Array.isArray(data.preferredPetSize) ? data.preferredPetSize : [],
    experienceLevel: (data.experienceLevel as string) || 'beginner',
    experienceWithDogs: Boolean(data.experienceWithDogs),
    experienceWithCats: Boolean(data.experienceWithCats),
    experienceWithLargeDogs: Boolean(data.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(data.experienceWithSeniorPets),
    latitude: asNumber(data.latitude) ?? null,
    longitude: asNumber(data.longitude) ?? null,
    ratingAverage: asNumber(data.ratingAverage) || 0,
    ratingCount: asNumber(data.ratingCount) || 0,
    trustScore: asNumber(data.trustScore) || 0,
    createdAt: data.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function syncPublicProfile(uid: string): Promise<void> {
  const privateProfileRef = doc(db, 'users', uid);
  const privateProfileSnap = await getDoc(privateProfileRef);
  if (!privateProfileSnap.exists()) {
    return;
  }

  await setDoc(getPublicProfileRef(uid), buildPublicProfileDocument(uid, privateProfileSnap.data()), {
    merge: true,
  });
}

export async function syncPublicAvailabilitySummary(
  uid: string,
  slots: AvailabilitySlot[]
): Promise<void> {
  const publicProfileRef = getPublicProfileRef(uid);
  const publicProfileSnap = await getDoc(publicProfileRef);
  if (!publicProfileSnap.exists()) {
    await syncPublicProfile(uid);
  }

  const nextAvailableSlot = slots[0];

  await setDoc(
    publicProfileRef,
    {
      uid,
      hasDetailedAvailability: slots.length > 0,
      nextAvailableStartAt: nextAvailableSlot ? Timestamp.fromDate(nextAvailableSlot.startAt) : null,
      nextAvailableEndAt: nextAvailableSlot ? Timestamp.fromDate(nextAvailableSlot.endAt) : null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPublicProfile(uid: string): Promise<PublicUserProfile | null> {
  const profileSnap = await getDoc(getPublicProfileRef(uid));
  if (!profileSnap.exists()) {
    return null;
  }

  return mapPublicUserProfile(profileSnap.id, profileSnap.data());
}

export function mapPublicUserProfile(
  id: string,
  data: Record<string, unknown>
): PublicUserProfile {
  return {
    uid: (data.uid as string) || id,
    name: (data.name as string) || 'User',
    location: (data.location as string) || '',
    country: (data.country as string) || 'Finland',
    photoURL: (data.photoURL as string) || '',
    bio: (data.bio as string) || '',
    petExperience: (data.petExperience as string) || '',
    availability: ((data.availability as PublicUserProfile['availability']) || 'available'),
    phoneVerified: Boolean(data.phoneVerified),
    petTypeExperience: Array.isArray(data.petTypeExperience) ? (data.petTypeExperience as string[]) : [],
    preferredPetSize: Array.isArray(data.preferredPetSize) ? (data.preferredPetSize as string[]) : [],
    experienceLevel: (data.experienceLevel as PublicUserProfile['experienceLevel']) || 'beginner',
    experienceWithDogs: Boolean(data.experienceWithDogs),
    experienceWithCats: Boolean(data.experienceWithCats),
    experienceWithLargeDogs: Boolean(data.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(data.experienceWithSeniorPets),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    ratingAverage: asNumber(data.ratingAverage) || 0,
    ratingCount: asNumber(data.ratingCount) || 0,
    trustScore: asNumber(data.trustScore) || 0,
    hasDetailedAvailability: Boolean(data.hasDetailedAvailability),
    nextAvailableStartAt: toDate(data.nextAvailableStartAt),
    nextAvailableEndAt: toDate(data.nextAvailableEndAt),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

export async function getAvailablePublicProfiles(): Promise<PublicUserProfile[]> {
  const profilesQuery = query(
    collection(db, PUBLIC_PROFILES_COLLECTION),
    where('availability', '==', 'available')
  );
  const snapshot = await getDocs(profilesQuery);

  const profiles: PublicUserProfile[] = [];
  snapshot.forEach((profileDoc) => {
    profiles.push(mapPublicUserProfile(profileDoc.id, profileDoc.data()));
  });

  profiles.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return profiles;
}
