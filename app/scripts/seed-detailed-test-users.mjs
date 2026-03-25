import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

function loadLocalEnv() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envFilePath = resolve(currentDir, '..', '.env.local');
  const fileContents = readFileSync(envFilePath, 'utf8');

  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (!firebaseApiKey || !firebaseAuthDomain || !firebaseProjectId || !firebaseAppId) {
  throw new Error('Missing Firebase environment variables.');
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

const sharedPassword = 'test123';
const legacySharedPasswords = ['PetBuddy123!'];
const now = new Date();

function hoursFromNow(hoursAhead) {
  return new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
}

const users = [
  {
    email: 'user1@gmail.com',
    name: 'Anna Virtanen',
    location: 'Helsinki',
    country: 'Finland',
    latitude: 60.1699,
    longitude: 24.9384,
    phoneNumber: '+358401111111',
    availability: 'unavailable',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AnnaVirtanen',
    bio: 'Warm and organized pet parent living near the Helsinki city center. I keep routines consistent and communicate clearly.',
    petExperience: 'I have cared for rescue dogs for years and I am comfortable with feeding schedules, leash manners, and medication reminders.',
    petTypeExperience: ['dog'],
    preferredPetSize: ['medium', 'large'],
    experienceLevel: 'intermediate',
    experienceWithDogs: true,
    experienceWithCats: false,
    experienceWithLargeDogs: true,
    experienceWithSeniorPets: false,
    ratingAverage: 4.8,
    ratingCount: 3,
    trustScore: 50,
    walletBalance: 18,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 15, reference: 'Local testing credits', balanceAfter: 18 },
    ],
    availabilitySlots: [],
    pets: [
      {
        id: 'luna',
        name: 'Luna',
        type: 'dog',
        breed: 'Labrador Retriever',
        age: 4,
        size: 'large',
        notes: 'Loves long walks and settles quickly after exercise.',
        behaviour: 'Friendly and social',
        allergies: 'Chicken',
        vaccinationStatus: 'Up to date',
        friendlyWithDogs: true,
        friendlyWithCats: false,
        friendlyWithChildren: true,
        medicationRequired: false,
        specialCareInstructions: 'Use a front-clip harness for city walks.',
        emergencyVetContact: 'Helsinki Vet Center +358 10 123 4567',
      },
    ],
  },
  {
    email: 'user2@gmail.com',
    name: 'Mikko Laine',
    location: 'Espoo',
    country: 'Finland',
    latitude: 60.2055,
    longitude: 24.6559,
    phoneNumber: '+358402222222',
    availability: 'available',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MikkoLaine',
    bio: 'Calm remote worker with a predictable schedule and a quiet apartment. I prefer sitters who give regular updates.',
    petExperience: 'I have looked after cats for more than five years and I am used to shy pets who need gentle introductions.',
    petTypeExperience: ['cat'],
    preferredPetSize: ['small', 'medium'],
    experienceLevel: 'intermediate',
    experienceWithDogs: false,
    experienceWithCats: true,
    experienceWithLargeDogs: false,
    experienceWithSeniorPets: true,
    ratingAverage: 4.7,
    ratingCount: 2,
    trustScore: 50,
    walletBalance: 14,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 11, reference: 'Local testing credits', balanceAfter: 14 },
    ],
    availabilitySlots: [
      { id: 'cat-care-morning', startAt: hoursFromNow(16), endAt: hoursFromNow(22) },
      { id: 'quiet-evening', startAt: hoursFromNow(44), endAt: hoursFromNow(52) },
    ],
    pets: [
      {
        id: 'nala',
        name: 'Nala',
        type: 'cat',
        breed: 'Domestic Shorthair',
        age: 2,
        size: 'small',
        notes: 'Indoor cat who loves puzzle feeders and sunny window spots.',
        behaviour: 'Curious but cautious with new people',
        allergies: '',
        vaccinationStatus: 'Up to date',
        friendlyWithDogs: false,
        friendlyWithCats: true,
        friendlyWithChildren: true,
        medicationRequired: false,
        specialCareInstructions: 'Keep the hallway door closed because she slips out quickly.',
        emergencyVetContact: 'Espoo Animal Clinic +358 20 987 6543',
      },
    ],
  },
  {
    email: 'user3@gmail.com',
    name: 'Sofia Niemi',
    location: 'Vantaa',
    country: 'Finland',
    latitude: 60.2934,
    longitude: 25.0378,
    phoneNumber: '+358403333333',
    availability: 'available',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SofiaNiemi',
    bio: 'Active family household close to parks and walking routes. I value dependable sitters who are comfortable with mixed-pet homes.',
    petExperience: 'I handle both dogs and cats every day, including feeding routines, enrichment, and senior pet comfort care.',
    petTypeExperience: ['dog', 'cat'],
    preferredPetSize: ['small', 'medium', 'large'],
    experienceLevel: 'expert',
    experienceWithDogs: true,
    experienceWithCats: true,
    experienceWithLargeDogs: true,
    experienceWithSeniorPets: true,
    ratingAverage: 4.9,
    ratingCount: 4,
    trustScore: 50,
    walletBalance: 21,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 18, reference: 'Local testing credits', balanceAfter: 21 },
    ],
    availabilitySlots: [
      { id: 'mixed-pets-day', startAt: hoursFromNow(20), endAt: hoursFromNow(32) },
      { id: 'senior-pet-weekend', startAt: hoursFromNow(68), endAt: hoursFromNow(82) },
    ],
    pets: [
      {
        id: 'bruno',
        name: 'Bruno',
        type: 'dog',
        breed: 'Golden Retriever',
        age: 6,
        size: 'large',
        notes: 'Gentle dog who enjoys playtime and short fetch sessions.',
        behaviour: 'Steady and affectionate',
        allergies: '',
        vaccinationStatus: 'Up to date',
        friendlyWithDogs: true,
        friendlyWithCats: true,
        friendlyWithChildren: true,
        medicationRequired: false,
        specialCareInstructions: 'Needs a towel by the door after rainy walks.',
        emergencyVetContact: 'Vantaa Pet Hospital +358 30 765 4321',
      },
      {
        id: 'mimi',
        name: 'Mimi',
        type: 'cat',
        breed: 'Ragdoll',
        age: 5,
        size: 'medium',
        notes: 'Prefers calm spaces and likes being brushed in the evening.',
        behaviour: 'Quiet and affectionate',
        allergies: 'Sensitive to strong perfumes',
        vaccinationStatus: 'Up to date',
        friendlyWithDogs: true,
        friendlyWithCats: true,
        friendlyWithChildren: true,
        medicationRequired: false,
        specialCareInstructions: 'Leave a night light on near the living room.',
        emergencyVetContact: 'Vantaa Pet Hospital +358 30 765 4321',
      },
    ],
  },
  {
    email: 'user4@gmail.com',
    name: 'Elina Koskinen',
    location: 'Helsinki',
    country: 'Finland',
    latitude: 60.1756,
    longitude: 24.9342,
    phoneNumber: '+358404444444',
    availability: 'available',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ElinaKoskinen',
    bio: 'Experienced sitter with flexible weekday availability and a strong focus on calm, low-stress pet care.',
    petExperience: 'I have completed many dog walks, medication schedules, cat drop-ins, and overnight stays with senior pets.',
    petTypeExperience: ['dog', 'cat'],
    preferredPetSize: ['small', 'medium', 'large'],
    experienceLevel: 'expert',
    experienceWithDogs: true,
    experienceWithCats: true,
    experienceWithLargeDogs: true,
    experienceWithSeniorPets: true,
    ratingAverage: 5,
    ratingCount: 12,
    trustScore: 50,
    walletBalance: 24,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 21, reference: 'Local testing credits', balanceAfter: 24 },
    ],
    availabilitySlots: [
      { id: 'weekday-morning', startAt: hoursFromNow(18), endAt: hoursFromNow(26) },
      { id: 'weekend-day', startAt: hoursFromNow(48), endAt: hoursFromNow(60) },
      { id: 'evening-dropin', startAt: hoursFromNow(84), endAt: hoursFromNow(92) },
    ],
    pets: [],
  },
  {
    email: 'user5@gmail.com',
    name: 'Joonas Saari',
    location: 'Espoo',
    country: 'Finland',
    latitude: 60.1841,
    longitude: 24.8276,
    phoneNumber: '+358405555555',
    availability: 'available',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=JoonasSaari',
    bio: 'Reliable evening and weekend sitter who is especially good with shy cats and smaller dogs.',
    petExperience: 'I have supported several neighbors with cat sitting, puppy check-ins, and routine feeding visits.',
    petTypeExperience: ['dog', 'cat'],
    preferredPetSize: ['small', 'medium'],
    experienceLevel: 'intermediate',
    experienceWithDogs: true,
    experienceWithCats: true,
    experienceWithLargeDogs: false,
    experienceWithSeniorPets: true,
    ratingAverage: 4.4,
    ratingCount: 6,
    trustScore: 40,
    walletBalance: 16,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 13, reference: 'Local testing credits', balanceAfter: 16 },
    ],
    availabilitySlots: [
      { id: 'after-work', startAt: hoursFromNow(30), endAt: hoursFromNow(36) },
      { id: 'weekend-evening', startAt: hoursFromNow(72), endAt: hoursFromNow(80) },
    ],
    pets: [],
  },
  {
    email: 'user6@gmail.com',
    name: 'Laura Maki',
    location: 'Vantaa',
    country: 'Finland',
    latitude: 60.3017,
    longitude: 25.039,
    phoneNumber: '+358406666666',
    availability: 'available',
    photoURL: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LauraMaki',
    bio: 'Patient sitter who enjoys structured care plans and detailed updates for busy pet owners.',
    petExperience: 'I regularly handle large dogs, bonded cat pairs, and senior pets who need careful observation and medication logs.',
    petTypeExperience: ['dog', 'cat'],
    preferredPetSize: ['medium', 'large'],
    experienceLevel: 'expert',
    experienceWithDogs: true,
    experienceWithCats: true,
    experienceWithLargeDogs: true,
    experienceWithSeniorPets: true,
    ratingAverage: 4.9,
    ratingCount: 9,
    trustScore: 50,
    walletBalance: 27,
    walletTransactions: [
      { id: 'starter-bonus', type: 'starter_bonus', amount: 3, reference: 'Starter bonus', balanceAfter: 3 },
      { id: 'local-credits', type: 'earn', amount: 24, reference: 'Local testing credits', balanceAfter: 27 },
    ],
    availabilitySlots: [
      { id: 'long-stay', startAt: hoursFromNow(24), endAt: hoursFromNow(72) },
      { id: 'next-week', startAt: hoursFromNow(120), endAt: hoursFromNow(156) },
    ],
    pets: [],
  },
];

function isRetryablePasswordError(error) {
  const errorCode =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return ['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password'].includes(
    errorCode
  );
}

async function signInWithKnownPassword(seedAuth, email, password, fallbackPasswords = []) {
  const passwordsToTry = [password, ...fallbackPasswords].filter(
    (candidate, index, candidates) =>
      typeof candidate === 'string' &&
      candidate.trim().length > 0 &&
      candidates.indexOf(candidate) === index
  );
  let lastError;

  for (const candidatePassword of passwordsToTry) {
    try {
      const existing = await signInWithEmailAndPassword(seedAuth, email, candidatePassword);

      if (candidatePassword !== password) {
        await updatePassword(existing.user, password);
      }

      return existing.user;
    } catch (error) {
      if (!isRetryablePasswordError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

async function signUpOrLogin(seedAuth, email, password, fallbackPasswords = []) {
  try {
    const created = await createUserWithEmailAndPassword(seedAuth, email, password);
    return {
      user: created.user,
      mode: 'created',
    };
  } catch (error) {
    const errorCode =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (errorCode !== 'auth/email-already-in-use') {
      throw error;
    }

    const existing = await signInWithKnownPassword(
      seedAuth,
      email,
      password,
      fallbackPasswords
    );
    return {
      user: existing,
      mode: 'updated',
    };
  }
}

function buildPublicProfileDocument(uid, profile) {
  return {
    uid,
    name: profile.name || '',
    location: profile.location || '',
    country: profile.country || 'Finland',
    photoURL: profile.photoURL || '',
    bio: profile.bio || '',
    petExperience: profile.petExperience || '',
    availability: profile.availability || 'available',
    phoneVerified: Boolean(profile.phoneVerified),
    petTypeExperience: Array.isArray(profile.petTypeExperience) ? profile.petTypeExperience : [],
    preferredPetSize: Array.isArray(profile.preferredPetSize) ? profile.preferredPetSize : [],
    experienceLevel: profile.experienceLevel || 'beginner',
    experienceWithDogs: Boolean(profile.experienceWithDogs),
    experienceWithCats: Boolean(profile.experienceWithCats),
    experienceWithLargeDogs: Boolean(profile.experienceWithLargeDogs),
    experienceWithSeniorPets: Boolean(profile.experienceWithSeniorPets),
    latitude: typeof profile.latitude === 'number' ? profile.latitude : null,
    longitude: typeof profile.longitude === 'number' ? profile.longitude : null,
    ratingAverage: typeof profile.ratingAverage === 'number' ? profile.ratingAverage : 0,
    ratingCount: typeof profile.ratingCount === 'number' ? profile.ratingCount : 0,
    trustScore: typeof profile.trustScore === 'number' ? profile.trustScore : 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildPublicAvailabilitySummary(slots = []) {
  const upcomingSlots = [...slots]
    .filter((slot) => slot.endAt.getTime() >= now.getTime())
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  const nextAvailableSlot = upcomingSlots[0];

  return {
    hasDetailedAvailability: upcomingSlots.length > 0,
    nextAvailableStartAt: nextAvailableSlot ? nextAvailableSlot.startAt : null,
    nextAvailableEndAt: nextAvailableSlot ? nextAvailableSlot.endAt : null,
  };
}

async function writeFirestoreDocuments(seedDb, uid, profile) {
  await setDoc(doc(seedDb, 'users', uid), {
    uid,
    email: profile.email,
    name: profile.name,
    location: profile.location,
    country: profile.country,
    photoURL: profile.photoURL,
    bio: profile.bio,
    petExperience: profile.petExperience,
    availability: profile.availability,
    emailVerified: false,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(seedDb, 'publicProfiles', uid), {
    ...buildPublicProfileDocument(uid, {
      ...profile,
      phoneVerified: true,
    }),
    ...buildPublicAvailabilitySummary(profile.availabilitySlots),
  }, { merge: true });

  await setDoc(doc(seedDb, 'users', uid, 'wallet', 'main'), {
    balance: profile.walletBalance,
    lastRequestId: '',
    lastRequestOwnerId: '',
    lastWalletAction: 'manual_earn',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  for (const tx of profile.walletTransactions) {
    await setDoc(doc(seedDb, 'users', uid, 'wallet', 'main', 'transactions', tx.id), {
      type: tx.type,
      amount: tx.amount,
      reference: tx.reference,
      timestamp: serverTimestamp(),
      balanceAfter: tx.balanceAfter,
    }, { merge: true });
  }

  for (const pet of profile.pets) {
    await setDoc(doc(seedDb, 'users', uid, 'pets', pet.id), {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      age: pet.age,
      size: pet.size,
      notes: pet.notes,
      behaviour: pet.behaviour,
      allergies: pet.allergies,
      vaccinationStatus: pet.vaccinationStatus,
      friendlyWithDogs: pet.friendlyWithDogs,
      friendlyWithCats: pet.friendlyWithCats,
      friendlyWithChildren: pet.friendlyWithChildren,
      medicationRequired: pet.medicationRequired,
      specialCareInstructions: pet.specialCareInstructions,
      emergencyVetContact: pet.emergencyVetContact,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  for (const slot of profile.availabilitySlots || []) {
    await setDoc(doc(seedDb, 'users', uid, 'availabilitySlots', slot.id), {
      startAt: slot.startAt,
      endAt: slot.endAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

async function main() {
  const results = [];

  for (const user of users) {
    const seedApp = initializeApp(firebaseConfig, `detailed-test-seed-${Date.now()}-${user.email}`);
    const seedAuth = getAuth(seedApp);
    const seedDb = getFirestore(seedApp);

    try {
      const authResult = await signUpOrLogin(
        seedAuth,
        user.email,
        sharedPassword,
        legacySharedPasswords
      );
      await authResult.user.getIdToken();
      await updateProfile(authResult.user, {
        displayName: user.name,
        photoURL: user.photoURL,
      });
      await writeFirestoreDocuments(seedDb, authResult.user.uid, user);

      results.push({
        email: user.email,
        password: sharedPassword,
        uid: authResult.user.uid,
        status: authResult.mode,
      });
    } catch (error) {
      results.push({
        email: user.email,
        password: sharedPassword,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      await signOut(seedAuth).catch(() => undefined);
      await deleteApp(seedApp).catch(() => undefined);
    }
  }

  console.table(results);
}

await main();
