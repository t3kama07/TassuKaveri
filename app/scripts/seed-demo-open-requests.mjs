import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(appRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_PASSWORD = 'test122';
const now = new Date();

function hoursFromNow(hours) {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

const demoOwners = [
  {
    email: 'openrequest-owner1@example.com',
    name: 'Anna Virtanen',
    location: 'Helsinki',
    latitude: 60.1699,
    longitude: 24.9384,
    pet: {
      id: 'demo-luna',
      name: 'Luna',
      type: 'dog',
      breed: 'Labrador Retriever',
      age: 4,
      size: 'large',
      notes: 'Loves calm walks and settles quickly after exercise.',
    },
    request: {
      id: 'demo-open-request-luna-weekend',
      careType: 'walking',
      startAt: hoursFromNow(48),
      endAt: hoursFromNow(52),
      credits: 8,
      notes: 'Luna needs two calm walks and company while I am away for the afternoon.',
      feeding: 'Lunch is already prepared. Fresh water after each walk.',
      walks: 'Two slow walks, about 30 minutes each. Use the front-clip harness.',
      medicine: 'No medication right now.',
      sleep: 'She rests best in the living room after walks.',
      warnings: 'Avoid busy tram stops because she can get excited.',
    },
  },
  {
    email: 'openrequest-owner2@example.com',
    name: 'Mikko Laine',
    location: 'Espoo',
    latitude: 60.2055,
    longitude: 24.6559,
    pet: {
      id: 'demo-nala',
      name: 'Nala',
      type: 'cat',
      breed: 'Domestic Shorthair',
      age: 2,
      size: 'small',
      notes: 'Indoor cat who likes puzzle feeders and quiet greetings.',
    },
    request: {
      id: 'demo-open-request-nala-dropin',
      careType: 'daily-visit',
      startAt: hoursFromNow(42),
      endAt: hoursFromNow(44),
      credits: 5,
      notes: 'Nala needs a quiet evening visit for food, litter, and a little play.',
      feeding: 'Wet food in the fridge. Puzzle feeder is on the kitchen shelf.',
      walks: 'Indoor play only, no outdoor time.',
      medicine: 'No medication.',
      sleep: 'Leave the hallway door closed before you open the apartment door.',
      warnings: 'She may hide at first. Slow and quiet introductions are best.',
    },
  },
  {
    email: 'openrequest-owner3@example.com',
    name: 'Sofia Niemi',
    location: 'Vantaa',
    latitude: 60.2934,
    longitude: 25.0378,
    pet: {
      id: 'demo-bruno',
      name: 'Bruno',
      type: 'dog',
      breed: 'Golden Retriever',
      age: 6,
      size: 'large',
      notes: 'Gentle dog who enjoys playtime and short fetch sessions.',
    },
    request: {
      id: 'demo-open-request-bruno-overnight',
      careType: 'overnight',
      startAt: hoursFromNow(96),
      endAt: hoursFromNow(120),
      credits: 12,
      notes: 'Overnight care for Bruno. He is gentle but needs his normal routine.',
      feeding: 'Dinner at 18:00 and breakfast at 8:00.',
      walks: 'One evening walk and one morning walk.',
      medicine: 'No medication.',
      sleep: 'Bruno sleeps near the hallway.',
      warnings: 'Please keep balcony doors closed.',
    },
  },
  {
    email: 'openrequest-owner4@example.com',
    name: 'Aino Salonen',
    location: 'Tampere',
    latitude: 61.4978,
    longitude: 23.761,
    pet: {
      id: 'demo-onni',
      name: 'Onni',
      type: 'dog',
      breed: 'Cavalier King Charles Spaniel',
      age: 5,
      size: 'small',
      notes: 'Enjoys shorter walks and likes a calm greeting indoors.',
    },
    request: {
      id: 'demo-open-request-onni-boarding',
      careType: 'boarding',
      startAt: hoursFromNow(144),
      endAt: hoursFromNow(192),
      credits: 18,
      notes: 'Onni needs a calm boarding stay while I travel. He is small, friendly, and likes routine.',
      feeding: 'Dinner after the evening walk. Keep water available.',
      walks: 'Short walks are best. He does not need long runs.',
      medicine: 'No medication.',
      sleep: 'He sleeps in his own bed if it is placed near people.',
      warnings: 'Avoid very loud environments.',
    },
  },
];

async function findAuthUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
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

async function ensureAuthUser(owner) {
  const existingUserId = await findAuthUserByEmail(owner.email);
  const userMetadata = {
    name: owner.name,
    displayName: owner.name,
  };

  if (existingUserId) {
    const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
      email: owner.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error) {
      throw new Error(`Failed to update demo owner ${owner.email}: ${error.message}`);
    }

    return existingUserId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: owner.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data.user?.id) {
    throw new Error(`Failed to create demo owner ${owner.email}: ${error?.message ?? 'Missing user id'}`);
  }

  return data.user.id;
}

async function upsertRows(table, rows) {
  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    throw new Error(`Failed to upsert ${table}: ${error.message}`);
  }
}

async function main() {
  const seeded = [];

  for (const owner of demoOwners) {
    const uid = await ensureAuthUser(owner);
    const timestamp = now.toISOString();

    await upsertRows('profiles', [
      {
        uid,
        email: owner.email,
        name: owner.name,
        location: owner.location,
        country: 'Finland',
        photo_url: '',
        bio: 'Demo pet owner used for reviewing open request UI.',
        pet_experience: 'Keeps clear routines and care notes for sitters.',
        availability: 'unavailable',
        email_verified: true,
        phone_number: '',
        phone_verified: false,
        pet_type_experience: [owner.pet.type],
        preferred_pet_size: [owner.pet.size],
        experience_level: 'intermediate',
        experience_with_dogs: owner.pet.type === 'dog',
        experience_with_cats: owner.pet.type === 'cat',
        experience_with_large_dogs: owner.pet.size === 'large',
        experience_with_senior_pets: false,
        latitude: owner.latitude,
        longitude: owner.longitude,
        rating_average: 0,
        rating_count: 0,
        trust_score: 35,
        role: 'user',
        frozen: false,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);

    await upsertRows('public_profiles', [
      {
        uid,
        name: owner.name,
        location: owner.location,
        country: 'Finland',
        photo_url: '',
        bio: 'Demo pet owner used for reviewing open request UI.',
        pet_experience: 'Keeps clear routines and care notes for sitters.',
        availability: 'unavailable',
        phone_verified: false,
        pet_type_experience: [owner.pet.type],
        preferred_pet_size: [owner.pet.size],
        experience_level: 'intermediate',
        experience_with_dogs: owner.pet.type === 'dog',
        experience_with_cats: owner.pet.type === 'cat',
        experience_with_large_dogs: owner.pet.size === 'large',
        experience_with_senior_pets: false,
        latitude: owner.latitude,
        longitude: owner.longitude,
        rating_average: 0,
        rating_count: 0,
        trust_score: 35,
        has_detailed_availability: false,
        next_available_start_at: null,
        next_available_end_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);

    await upsertRows('pets', [
      {
        id: `${uid}-${owner.pet.id}`,
        owner_uid: uid,
        name: owner.pet.name,
        pet_type: owner.pet.type,
        breed: owner.pet.breed,
        age: owner.pet.age,
        pet_size: owner.pet.size,
        notes: owner.pet.notes,
        behaviour: 'Friendly with clear routine',
        allergies: '',
        vaccination_status: 'Up to date',
        friendly_with_dogs: owner.pet.type === 'dog',
        friendly_with_cats: true,
        friendly_with_children: true,
        medication_required: false,
        special_care_instructions: owner.request.warnings,
        emergency_vet_contact: '',
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);

    await upsertRows('wallets', [
      {
        user_uid: uid,
        balance: 24,
        last_request_id: '',
        last_request_owner_id: '',
        daily_earned_date: timestamp.slice(0, 10),
        daily_earned_credits: 0,
        last_wallet_action: 'starter_bonus',
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);

    await upsertRows('wallet_transactions', [
      {
        id: `demo-open-request-wallet-${uid}`,
        user_uid: uid,
        tx_type: 'starter_bonus',
        amount: 24,
        reference: 'Demo open request credits',
        request_id: null,
        occurred_at: timestamp,
        balance_after: 24,
      },
    ]);

    await upsertRows('requests', [
      {
        id: owner.request.id,
        owner_uid: uid,
        owner_name: owner.name,
        pet_ids: [`${uid}-${owner.pet.id}`],
        pet_names: [owner.pet.name],
        care_type: owner.request.careType,
        start_date: owner.request.startAt.toISOString(),
        end_date: owner.request.endAt.toISOString(),
        location: owner.location,
        location_lat: owner.latitude,
        location_lng: owner.longitude,
        credits_offered: owner.request.credits,
        status: 'open',
        audience: 'community',
        escrow_status: 'none',
        sitter_uid: null,
        sitter_name: null,
        requested_sitter_uid: null,
        requested_sitter_name: null,
        applications: [],
        review: null,
        owner_review: null,
        sitter_review: null,
        marked_complete_at: null,
        confirmed_complete_at: null,
        notes: owner.request.notes,
        feeding_schedule: owner.request.feeding,
        walk_schedule: owner.request.walks,
        medication_instructions: owner.request.medicine,
        sleep_instructions: owner.request.sleep,
        special_warnings: owner.request.warnings,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);

    seeded.push(`${owner.name}: ${owner.request.id}`);
  }

  console.log(`Seeded ${seeded.length} demo open requests.`);
  seeded.forEach((entry) => console.log(`- ${entry}`));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
