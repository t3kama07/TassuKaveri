import { PublicUserProfile } from '@/types/profile';
import { createSupabaseAdminClient } from './supabaseAdmin';
import { resolveProfileAvatarUrl } from './profileAvatar';

type DateInput = Date | string | number | null | undefined;
type SupabasePublicProfileRow = {
  uid: string;
  name: string;
  location: string;
  country: string;
  photo_url: string;
  bio: string;
  pet_experience: string;
  availability: PublicUserProfile['availability'];
  phone_verified: boolean;
  pet_type_experience: string[] | null;
  preferred_pet_size: string[] | null;
  experience_level: PublicUserProfile['experienceLevel'];
  experience_with_dogs: boolean;
  experience_with_cats: boolean;
  experience_with_large_dogs: boolean;
  experience_with_senior_pets: boolean;
  latitude: number | null;
  longitude: number | null;
  rating_average: number;
  rating_count: number;
  trust_score: number;
  has_detailed_availability: boolean;
  next_available_start_at: string | null;
  next_available_end_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabasePublicProfileInput = Partial<
  Omit<PublicUserProfile, 'createdAt' | 'updatedAt' | 'nextAvailableStartAt' | 'nextAvailableEndAt'>
> &
  Pick<PublicUserProfile, 'uid'> & {
    createdAt?: DateInput;
    updatedAt?: DateInput;
    nextAvailableStartAt?: DateInput;
    nextAvailableEndAt?: DateInput;
  };

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapPublicProfileToSupabaseRow(
  profile: SupabasePublicProfileInput
): Record<string, unknown> {
  const now = new Date();
  const row: Record<string, unknown> = {
    uid: profile.uid,
  };

  if ('name' in profile) row.name = asString(profile.name);
  if ('location' in profile) row.location = asString(profile.location);
  if ('country' in profile) row.country = asString(profile.country, 'Finland');
  if ('photoURL' in profile) row.photo_url = asString(profile.photoURL);
  if ('bio' in profile) row.bio = asString(profile.bio);
  if ('petExperience' in profile) row.pet_experience = asString(profile.petExperience);
  if ('availability' in profile) row.availability = asString(profile.availability, 'available');
  if ('phoneVerified' in profile) row.phone_verified = Boolean(profile.phoneVerified);
  if ('petTypeExperience' in profile) row.pet_type_experience = asStringArray(profile.petTypeExperience);
  if ('preferredPetSize' in profile) row.preferred_pet_size = asStringArray(profile.preferredPetSize);
  if ('experienceLevel' in profile) row.experience_level = asString(profile.experienceLevel, 'beginner');
  if ('experienceWithDogs' in profile) row.experience_with_dogs = Boolean(profile.experienceWithDogs);
  if ('experienceWithCats' in profile) row.experience_with_cats = Boolean(profile.experienceWithCats);
  if ('experienceWithLargeDogs' in profile) {
    row.experience_with_large_dogs = Boolean(profile.experienceWithLargeDogs);
  }
  if ('experienceWithSeniorPets' in profile) {
    row.experience_with_senior_pets = Boolean(profile.experienceWithSeniorPets);
  }
  if ('latitude' in profile) {
    row.latitude =
      typeof profile.latitude === 'number' && Number.isFinite(profile.latitude)
        ? profile.latitude
        : null;
  }
  if ('longitude' in profile) {
    row.longitude =
      typeof profile.longitude === 'number' && Number.isFinite(profile.longitude)
        ? profile.longitude
        : null;
  }
  if ('ratingAverage' in profile) row.rating_average = asNumber(profile.ratingAverage);
  if ('ratingCount' in profile) row.rating_count = asNumber(profile.ratingCount);
  if ('trustScore' in profile) row.trust_score = asNumber(profile.trustScore);
  if ('hasDetailedAvailability' in profile) {
    row.has_detailed_availability = Boolean(profile.hasDetailedAvailability);
  }
  if ('nextAvailableStartAt' in profile) {
    row.next_available_start_at = profile.nextAvailableStartAt
      ? toIsoString(profile.nextAvailableStartAt, now)
      : null;
  }
  if ('nextAvailableEndAt' in profile) {
    row.next_available_end_at = profile.nextAvailableEndAt
      ? toIsoString(profile.nextAvailableEndAt, now)
      : null;
  }
  if ('createdAt' in profile) row.created_at = toIsoString(profile.createdAt, now);
  if ('updatedAt' in profile) row.updated_at = toIsoString(profile.updatedAt, now);

  return row;
}

function mapSupabasePublicProfileRow(row: SupabasePublicProfileRow): PublicUserProfile {
  return {
    uid: row.uid,
    name: row.name || 'User',
    location: row.location || '',
    country: row.country || 'Finland',
    photoURL: resolveProfileAvatarUrl(row.photo_url || '', row.uid),
    bio: row.bio || '',
    petExperience: row.pet_experience || '',
    availability: row.availability || 'available',
    phoneVerified: Boolean(row.phone_verified),
    petTypeExperience: Array.isArray(row.pet_type_experience) ? row.pet_type_experience : [],
    preferredPetSize: Array.isArray(row.preferred_pet_size) ? row.preferred_pet_size : [],
    experienceLevel: row.experience_level || 'beginner',
    experienceWithDogs: Boolean(row.experience_with_dogs),
    experienceWithCats: Boolean(row.experience_with_cats),
    experienceWithLargeDogs: Boolean(row.experience_with_large_dogs),
    experienceWithSeniorPets: Boolean(row.experience_with_senior_pets),
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    ratingAverage: typeof row.rating_average === 'number' ? row.rating_average : 0,
    ratingCount: typeof row.rating_count === 'number' ? row.rating_count : 0,
    trustScore: typeof row.trust_score === 'number' ? row.trust_score : 0,
    hasDetailedAvailability: Boolean(row.has_detailed_availability),
    nextAvailableStartAt: toDate(row.next_available_start_at),
    nextAvailableEndAt: toDate(row.next_available_end_at),
    createdAt: toDate(row.created_at) || new Date(),
    updatedAt: toDate(row.updated_at) || new Date(),
  };
}

export async function upsertPublicProfileInSupabase(
  profile: SupabasePublicProfileInput
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('public_profiles')
    .upsert(mapPublicProfileToSupabaseRow(profile), { onConflict: 'uid' });

  if (error) {
    throw new Error(`Failed to upsert public profile in Supabase: ${error.message}`);
  }
}

export async function getPublicProfileFromSupabase(
  uid: string
): Promise<PublicUserProfile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('uid', uid)
    .maybeSingle<SupabasePublicProfileRow>();

  if (error) {
    throw new Error(`Failed to read public profile from Supabase: ${error.message}`);
  }

  return data ? mapSupabasePublicProfileRow(data) : null;
}

export async function getAvailablePublicProfilesFromSupabase(options: {
  city?: string;
  limit?: number;
} = {}): Promise<PublicUserProfile[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('public_profiles')
    .select('*')
    .eq('availability', 'available')
    .order('updated_at', { ascending: false });

  const city = options.city?.trim();
  if (city) {
    query = query.ilike('location', `%${city}%`);
  }

  if (typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    query = query.limit(Math.floor(options.limit));
  }

  const { data, error } = await query.returns<SupabasePublicProfileRow[]>();

  if (error) {
    throw new Error(`Failed to read public profiles from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabasePublicProfileRow);
}
