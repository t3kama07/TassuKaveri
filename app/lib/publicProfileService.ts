import { AvailabilitySlot } from '@/types/availability';
import { PublicUserProfile } from '@/types/profile';
import type { SupabasePublicProfileInput } from './supabasePublicProfileStore';
import { mirrorPublicProfileToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

async function syncPublicProfileMirror(profile: SupabasePublicProfileInput): Promise<void> {
  await mirrorPublicProfileToSupabase(profile);
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
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  };
}

async function getPrivateProfileRecord(uid: string): Promise<Record<string, unknown> | null> {
  const payload = await fetchSupabaseReadJson<{ profile: Record<string, unknown> | null }>(
    `/api/supabase-read/profile?uid=${encodeURIComponent(uid)}`,
    { requireAuth: true }
  );

  return payload.profile;
}

export async function syncPublicProfile(uid: string): Promise<void> {
  const privateProfile = await getPrivateProfileRecord(uid);
  if (!privateProfile) {
    return;
  }

  const publicProfileDocument = buildPublicProfileDocument(uid, privateProfile);

  await syncPublicProfileMirror({
    uid,
    name: (publicProfileDocument.name as string) || '',
    location: (publicProfileDocument.location as string) || '',
    country: (publicProfileDocument.country as string) || 'Finland',
    photoURL: (publicProfileDocument.photoURL as string) || '',
    bio: (publicProfileDocument.bio as string) || '',
    petExperience: (publicProfileDocument.petExperience as string) || '',
    availability:
      (publicProfileDocument.availability as PublicUserProfile['availability']) || 'available',
    phoneVerified: Boolean(publicProfileDocument.phoneVerified),
    petTypeExperience: Array.isArray(publicProfileDocument.petTypeExperience)
      ? (publicProfileDocument.petTypeExperience as string[])
      : [],
    preferredPetSize: Array.isArray(publicProfileDocument.preferredPetSize)
      ? (publicProfileDocument.preferredPetSize as string[])
      : [],
    experienceLevel:
      (publicProfileDocument.experienceLevel as PublicUserProfile['experienceLevel']) ||
      'beginner',
    experienceWithDogs: Boolean(publicProfileDocument.experienceWithDogs),
    experienceWithCats: Boolean(publicProfileDocument.experienceWithCats),
    experienceWithLargeDogs: Boolean(publicProfileDocument.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(publicProfileDocument.experienceWithSeniorPets),
    latitude: asNumber(publicProfileDocument.latitude),
    longitude: asNumber(publicProfileDocument.longitude),
    ratingAverage: asNumber(publicProfileDocument.ratingAverage) || 0,
    ratingCount: asNumber(publicProfileDocument.ratingCount) || 0,
    trustScore: asNumber(publicProfileDocument.trustScore) || 0,
    createdAt: toDate(publicProfileDocument.createdAt),
    updatedAt: toDate(publicProfileDocument.updatedAt) ?? new Date(),
  });
}

export async function syncPublicAvailabilitySummary(
  uid: string,
  slots: AvailabilitySlot[]
): Promise<void> {
  const nextAvailableSlot = slots[0];

  await syncPublicProfileMirror({
    uid,
    hasDetailedAvailability: slots.length > 0,
    nextAvailableStartAt: nextAvailableSlot?.startAt ?? null,
    nextAvailableEndAt: nextAvailableSlot?.endAt ?? null,
    updatedAt: new Date(),
  });
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

export async function getPublicProfile(uid: string): Promise<PublicUserProfile | null> {
  const payload = await fetchSupabaseReadJson<{ profile: Record<string, unknown> | null }>(
    `/api/supabase-read/public-profile?uid=${encodeURIComponent(uid)}`
  );

  return payload.profile ? mapPublicUserProfile(uid, payload.profile) : null;
}

export async function getAvailablePublicProfiles(): Promise<PublicUserProfile[]> {
  const payload = await fetchSupabaseReadJson<{ profiles: Array<Record<string, unknown>> }>(
    '/api/supabase-read/public-profile?available=true'
  );

  return payload.profiles.map((profile) =>
    mapPublicUserProfile((profile.uid as string) || '', profile)
  );
}
