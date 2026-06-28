import { UserProfile } from '@/types/profile';
import { createSupabaseAdminClient } from './supabaseAdmin';
import { resolveProfileAvatarUrl } from './profileAvatar';

type DateInput = Date | string | number | null | undefined;

export type SupabaseProfileInput = Partial<
  Omit<UserProfile, 'createdAt' | 'updatedAt' | 'phoneVerificationExpires'>
> &
  Pick<UserProfile, 'uid' | 'email'> & {
    createdAt?: DateInput;
    updatedAt?: DateInput;
    phoneVerificationExpires?: DateInput;
  };

export type AdminUserCreditRecord = {
  uid: string;
  name: string;
  email: string;
  creditAmount: number;
  createdAt: Date;
};

type SupabaseAdminUserRow = {
  uid: string;
  email: string;
  name: string | null;
  created_at: string;
};

type SupabaseUserWalletRow = {
  user_uid: string;
  balance: number | null;
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

function toDate(value: unknown): Date | undefined {
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

function mapProfileToSupabaseRow(profile: SupabaseProfileInput): Record<string, unknown> {
  const now = new Date();

  return {
    uid: profile.uid,
    email: profile.email,
    name: asString(profile.name),
    location: asString(profile.location),
    country: asString(profile.country, 'Finland'),
    photo_url: asString(profile.photoURL),
    bio: asString(profile.bio),
    pet_experience: asString(profile.petExperience),
    availability: asString(profile.availability, 'available'),
    email_verified: Boolean(profile.emailVerified),
    phone_number: asString(profile.phoneNumber),
    phone_verified: Boolean(profile.phoneVerified),
    phone_verification_code:
      profile.phoneVerificationCode === undefined
        ? null
        : asString(profile.phoneVerificationCode) || null,
    phone_verification_expires: profile.phoneVerificationExpires
      ? toIsoString(profile.phoneVerificationExpires, now)
      : null,
    pet_type_experience: asStringArray(profile.petTypeExperience),
    preferred_pet_size: asStringArray(profile.preferredPetSize),
    experience_level: asString(profile.experienceLevel, 'beginner'),
    experience_with_dogs: Boolean(profile.experienceWithDogs),
    experience_with_cats: Boolean(profile.experienceWithCats),
    experience_with_large_dogs: Boolean(profile.experienceWithLargeDogs),
    experience_with_senior_pets: Boolean(profile.experienceWithSeniorPets),
    latitude:
      typeof profile.latitude === 'number' && Number.isFinite(profile.latitude)
        ? profile.latitude
        : null,
    longitude:
      typeof profile.longitude === 'number' && Number.isFinite(profile.longitude)
        ? profile.longitude
        : null,
    rating_average: asNumber(profile.ratingAverage),
    rating_count: asNumber(profile.ratingCount),
    trust_score: asNumber(profile.trustScore),
    role: asString(profile.role, 'user'),
    frozen: Boolean(profile.frozen),
    created_at: toIsoString(profile.createdAt, now),
    updated_at: toIsoString(profile.updatedAt, now),
  };
}

function mapSupabaseRowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    uid: asString(row.uid),
    email: asString(row.email),
    name: asString(row.name),
    location: asString(row.location),
    country: asString(row.country, 'Finland'),
    photoURL: resolveProfileAvatarUrl(asString(row.photo_url), asString(row.uid)),
    bio: asString(row.bio),
    petExperience: asString(row.pet_experience),
    availability:
      asString(row.availability, 'available') as UserProfile['availability'],
    emailVerified: Boolean(row.email_verified),
    phoneNumber: asString(row.phone_number),
    phoneVerified: Boolean(row.phone_verified),
    phoneVerificationCode: asString(row.phone_verification_code) || undefined,
    phoneVerificationExpires: toDate(row.phone_verification_expires),
    petTypeExperience: asStringArray(row.pet_type_experience),
    preferredPetSize: asStringArray(row.preferred_pet_size),
    experienceLevel:
      asString(row.experience_level, 'beginner') as UserProfile['experienceLevel'],
    experienceWithDogs: Boolean(row.experience_with_dogs),
    experienceWithCats: Boolean(row.experience_with_cats),
    experienceWithLargeDogs: Boolean(row.experience_with_large_dogs),
    experienceWithSeniorPets: Boolean(row.experience_with_senior_pets),
    latitude:
      typeof row.latitude === 'number' && Number.isFinite(row.latitude)
        ? row.latitude
        : undefined,
    longitude:
      typeof row.longitude === 'number' && Number.isFinite(row.longitude)
        ? row.longitude
        : undefined,
    ratingAverage: asNumber(row.rating_average),
    ratingCount: asNumber(row.rating_count),
    trustScore: asNumber(row.trust_score),
    role: asString(row.role, 'user') as UserProfile['role'],
    frozen: Boolean(row.frozen),
    createdAt: toDate(row.created_at) || new Date(),
    updatedAt: toDate(row.updated_at) || new Date(),
  };
}

export async function upsertProfileInSupabase(profile: SupabaseProfileInput): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('profiles')
    .upsert(mapProfileToSupabaseRow(profile), { onConflict: 'uid' });

  if (error) {
    throw new Error(`Failed to upsert profile in Supabase: ${error.message}`);
  }
}

export async function getProfileFromSupabase(uid: string): Promise<UserProfile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('uid', uid).maybeSingle();

  if (error) {
    throw new Error(`Failed to read profile from Supabase: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapSupabaseRowToProfile(data as Record<string, unknown>);
}

export async function profileExistsInSupabase(uid: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from('profiles')
    .select('uid', { count: 'exact', head: true })
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to check profile in Supabase: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

export async function getAdminUserCreditsFromSupabase(): Promise<AdminUserCreditRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('uid, email, name, created_at')
    .order('created_at', { ascending: false })
    .returns<SupabaseAdminUserRow[]>();

  if (profilesError) {
    throw new Error(`Failed to read admin user list from Supabase: ${profilesError.message}`);
  }

  const userIds = (profiles || []).map((profile) => profile.uid).filter(Boolean);
  const walletBalances = new Map<string, number>();

  if (userIds.length > 0) {
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('user_uid, balance')
      .in('user_uid', userIds)
      .returns<SupabaseUserWalletRow[]>();

    if (walletsError) {
      throw new Error(`Failed to read admin wallet balances from Supabase: ${walletsError.message}`);
    }

    (wallets || []).forEach((wallet) => {
      walletBalances.set(wallet.user_uid, asNumber(wallet.balance));
    });
  }

  return (profiles || []).map((profile) => ({
    uid: profile.uid,
    name: profile.name || '',
    email: profile.email || '',
    creditAmount: walletBalances.get(profile.uid) ?? 0,
    createdAt: toDate(profile.created_at) || new Date(),
  }));
}
