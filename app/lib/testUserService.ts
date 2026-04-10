import { createSupabaseAdminClient } from './supabaseAdmin';
import {
  DEMO_USER_PASSWORD,
  DetailedDemoUser,
  getDetailedDemoUsers,
} from './demoUserPresets';
import { upsertProfileInSupabase } from './supabaseProfileStore';
import { upsertPublicProfileInSupabase } from './supabasePublicProfileStore';
import { replaceOwnerPetsInSupabase } from './supabasePetStore';
import { replaceAvailabilitySlotsInSupabase } from './supabaseAvailabilityStore';
import { replaceWalletStateInSupabase } from './supabaseWalletStore';
import { getTodayKey } from './platformPolicy';

const DEFAULT_COUNTRY = 'Finland';
const STARTER_BALANCE = 3;

export interface TestUserSeedOptions {
  prefix: string;
  domain: string;
  count: number;
  startAt: number;
  password: string;
  location: string;
  country?: string;
}

export interface TestUserSeedResult {
  email: string;
  password: string;
  name: string;
  uid?: string;
  status: 'created' | 'updated' | 'failed';
  message: string;
}

type SeedUserMode = 'created' | 'updated';

function sanitizeDomain(domain: string): string {
  return domain.trim().replace(/^@+/, '');
}

function buildEmail(prefix: string, domain: string, index: number): string {
  return `${prefix.trim()}${index}@${sanitizeDomain(domain)}`;
}

function buildAvailabilitySummary(slots: Array<{ startAt: Date; endAt: Date }>) {
  const upcomingSlots = [...slots]
    .filter((slot) => slot.endAt.getTime() >= Date.now())
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  const nextAvailableSlot = upcomingSlots[0];

  return {
    hasDetailedAvailability: upcomingSlots.length > 0,
    nextAvailableStartAt: nextAvailableSlot?.startAt ?? null,
    nextAvailableEndAt: nextAvailableSlot?.endAt ?? null,
  };
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list Supabase auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (match?.id) {
      return match.id;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function createOrReuseAuthUser(params: {
  email: string;
  password: string;
  name: string;
  photoURL?: string;
}): Promise<{ uid: string; mode: SeedUserMode }> {
  const supabase = createSupabaseAdminClient();
  const existingUserId = await findAuthUserByEmail(params.email);

  if (existingUserId) {
    const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        name: params.name,
        displayName: params.name,
        avatar_url: params.photoURL ?? '',
      },
    });

    if (error) {
      throw new Error(`Failed to update Supabase auth user: ${error.message}`);
    }

    return {
      uid: existingUserId,
      mode: 'updated',
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      name: params.name,
      displayName: params.name,
      avatar_url: params.photoURL ?? '',
    },
  });

  if (error || !data.user?.id) {
    throw new Error(`Failed to create Supabase auth user: ${error?.message ?? 'Missing user id'}`);
  }

  return {
    uid: data.user.id,
    mode: 'created',
  };
}

function formatSeedError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

async function seedBasicUser(params: {
  uid: string;
  email: string;
  name: string;
  location: string;
  country: string;
}) {
  const now = new Date();

  await upsertProfileInSupabase({
    uid: params.uid,
    email: params.email,
    name: params.name,
    location: params.location,
    country: params.country,
    photoURL: '',
    bio: '',
    petExperience: '',
    availability: 'available',
    emailVerified: true,
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
    createdAt: now,
    updatedAt: now,
  });

  await upsertPublicProfileInSupabase({
    uid: params.uid,
    name: params.name,
    location: params.location,
    country: params.country,
    photoURL: '',
    bio: '',
    petExperience: '',
    availability: 'available',
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
    hasDetailedAvailability: false,
    nextAvailableStartAt: null,
    nextAvailableEndAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await replaceOwnerPetsInSupabase(params.uid, []);
  await replaceAvailabilitySlotsInSupabase(params.uid, []);
  await replaceWalletStateInSupabase({
    userId: params.uid,
    wallet: {
      balance: STARTER_BALANCE,
      lastRequestId: '',
      lastRequestOwnerId: '',
      dailyEarnedDate: getTodayKey(now),
      dailyEarnedCredits: 0,
      lastWalletAction: 'starter_bonus',
      createdAt: now,
      updatedAt: now,
    },
    transactions: [
      {
        id: `starter-bonus-${params.uid}`,
        type: 'starter_bonus',
        amount: STARTER_BALANCE,
        reference: 'Starter bonus',
        balanceAfter: STARTER_BALANCE,
        timestamp: now,
      },
    ],
  });
}

async function seedDetailedUser(uid: string, profile: DetailedDemoUser) {
  const now = new Date();
  const availabilitySummary = buildAvailabilitySummary(profile.availabilitySlots);

  await upsertProfileInSupabase({
    uid,
    email: profile.email,
    name: profile.name,
    location: profile.location,
    country: profile.country,
    photoURL: profile.photoURL,
    bio: profile.bio,
    petExperience: profile.petExperience,
    availability: profile.availability,
    emailVerified: true,
    phoneNumber: profile.phoneNumber,
    phoneVerified: true,
    petTypeExperience: profile.petTypeExperience,
    preferredPetSize: profile.preferredPetSize,
    experienceLevel: profile.experienceLevel,
    experienceWithDogs: profile.experienceWithDogs,
    experienceWithCats: profile.experienceWithCats,
    experienceWithLargeDogs: profile.experienceWithLargeDogs,
    experienceWithSeniorPets: profile.experienceWithSeniorPets,
    latitude: profile.latitude,
    longitude: profile.longitude,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    trustScore: profile.trustScore,
    role: 'user',
    frozen: false,
    createdAt: now,
    updatedAt: now,
  });

  await upsertPublicProfileInSupabase({
    uid,
    name: profile.name,
    location: profile.location,
    country: profile.country,
    photoURL: profile.photoURL,
    bio: profile.bio,
    petExperience: profile.petExperience,
    availability: profile.availability,
    phoneVerified: true,
    petTypeExperience: profile.petTypeExperience,
    preferredPetSize: profile.preferredPetSize,
    experienceLevel: profile.experienceLevel,
    experienceWithDogs: profile.experienceWithDogs,
    experienceWithCats: profile.experienceWithCats,
    experienceWithLargeDogs: profile.experienceWithLargeDogs,
    experienceWithSeniorPets: profile.experienceWithSeniorPets,
    latitude: profile.latitude,
    longitude: profile.longitude,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    trustScore: profile.trustScore,
    hasDetailedAvailability: availabilitySummary.hasDetailedAvailability,
    nextAvailableStartAt: availabilitySummary.nextAvailableStartAt,
    nextAvailableEndAt: availabilitySummary.nextAvailableEndAt,
    createdAt: now,
    updatedAt: now,
  });

  await replaceOwnerPetsInSupabase(
    uid,
    profile.pets.map((pet) => ({
      id: pet.id,
      ownerId: uid,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      age: pet.age,
      size: pet.size,
      notes: pet.notes,
      behaviour: pet.behaviour || '',
      allergies: pet.allergies || '',
      vaccinationStatus: pet.vaccinationStatus || '',
      friendlyWithDogs: Boolean(pet.friendlyWithDogs),
      friendlyWithCats: Boolean(pet.friendlyWithCats),
      friendlyWithChildren: Boolean(pet.friendlyWithChildren),
      medicationRequired: Boolean(pet.medicationRequired),
      specialCareInstructions: pet.specialCareInstructions || '',
      emergencyVetContact: pet.emergencyVetContact || '',
      createdAt: now,
      updatedAt: now,
    }))
  );

  await replaceAvailabilitySlotsInSupabase(
    uid,
    profile.availabilitySlots.map((slot) => ({
      id: slot.id,
      userId: uid,
      startAt: slot.startAt,
      endAt: slot.endAt,
      createdAt: now,
      updatedAt: now,
    }))
  );

  await replaceWalletStateInSupabase({
    userId: uid,
    wallet: {
      balance: profile.walletBalance,
      lastRequestId: '',
      lastRequestOwnerId: '',
      dailyEarnedDate: getTodayKey(now),
      dailyEarnedCredits: 0,
      lastWalletAction: 'manual_earn',
      createdAt: now,
      updatedAt: now,
    },
    transactions: profile.walletTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type as
        | 'earn'
        | 'spend'
        | 'escrow'
        | 'escrow-release'
        | 'escrow-refund'
        | 'starter_bonus',
      amount: transaction.amount,
      reference: transaction.reference,
      balanceAfter: transaction.balanceAfter,
      timestamp: now,
    })),
  });
}

export async function createTestUsers(options: TestUserSeedOptions): Promise<TestUserSeedResult[]> {
  const results: TestUserSeedResult[] = [];
  const count = Math.max(1, Math.floor(options.count));
  const startAt = Math.max(1, Math.floor(options.startAt));
  const password = options.password.trim();
  const location = options.location.trim();
  const country = options.country?.trim() || DEFAULT_COUNTRY;
  const prefix = options.prefix.trim();
  const domain = sanitizeDomain(options.domain);

  for (let offset = 0; offset < count; offset += 1) {
    const index = startAt + offset;
    const email = buildEmail(prefix, domain, index);
    const name = `Test User ${index}`;

    try {
      const authUser = await createOrReuseAuthUser({
        email,
        password,
        name,
      });

      await seedBasicUser({
        uid: authUser.uid,
        email,
        name,
        location,
        country,
      });

      results.push({
        email,
        password,
        name,
        uid: authUser.uid,
        status: authUser.mode,
        message:
          authUser.mode === 'created'
            ? 'Created Supabase test user'
            : 'Updated existing Supabase test user',
      });
    } catch (error: unknown) {
      results.push({
        email,
        password,
        name,
        status: 'failed',
        message: formatSeedError(error),
      });
    }
  }

  return results;
}

export async function seedDetailedDemoUsers(): Promise<TestUserSeedResult[]> {
  const results: TestUserSeedResult[] = [];

  for (const profile of getDetailedDemoUsers()) {
    try {
      const authUser = await createOrReuseAuthUser({
        email: profile.email,
        password: DEMO_USER_PASSWORD,
        name: profile.name,
        photoURL: profile.photoURL,
      });

      await seedDetailedUser(authUser.uid, profile);

      results.push({
        email: profile.email,
        password: DEMO_USER_PASSWORD,
        name: profile.name,
        uid: authUser.uid,
        status: authUser.mode,
        message:
          authUser.mode === 'created'
            ? 'Created detailed Supabase demo profile'
            : 'Updated detailed Supabase demo profile',
      });
    } catch (error: unknown) {
      results.push({
        email: profile.email,
        password: DEMO_USER_PASSWORD,
        name: profile.name,
        status: 'failed',
        message: formatSeedError(error),
      });
    }
  }

  return results;
}
