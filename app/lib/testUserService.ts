import { FirebaseError, deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase';
import {
  DEMO_USER_PASSWORD,
  DetailedDemoUser,
  getDetailedDemoUsers,
  LEGACY_DEMO_USER_PASSWORDS,
} from './demoUserPresets';
import { buildPublicProfileDocument } from './publicProfileService';

const DEFAULT_COUNTRY = 'Finland';
const STARTER_BALANCE = 3;
const WALLET_DOC = 'main';

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
type SeedAuthUser = Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'];

function sanitizeDomain(domain: string): string {
  return domain.trim().replace(/^@+/, '');
}

function buildEmail(prefix: string, domain: string, index: number): string {
  return `${prefix.trim()}${index}@${sanitizeDomain(domain)}`;
}

function buildProfileDocument(
  uid: string,
  email: string,
  name: string,
  location: string,
  country: string
) {
  return {
    uid,
    email,
    name,
    location,
    country,
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
  };
}

function buildDetailedProfileDocument(uid: string, profile: DetailedDemoUser) {
  return {
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
  };
}

function buildPublicAvailabilitySummary(
  slots: Array<{ startAt: Date; endAt: Date }>
) {
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

async function createOrReuseSeedUser(
  seedAuth: ReturnType<typeof getAuth>,
  email: string,
  password: string,
  fallbackPasswords: string[] = []
): Promise<{ uid: string; mode: SeedUserMode; user: SeedAuthUser }> {
  try {
    const credential = await createUserWithEmailAndPassword(seedAuth, email, password);
    return {
      uid: credential.user.uid,
      mode: 'created',
      user: credential.user,
    };
  } catch (error: unknown) {
    if (!(error instanceof FirebaseError) || error.code !== 'auth/email-already-in-use') {
      throw error;
    }

    const credential = await signInWithKnownPassword(
      seedAuth,
      email,
      password,
      fallbackPasswords
    );
    return {
      uid: credential.uid,
      mode: 'updated',
      user: credential,
    };
  }
}

function isRetryablePasswordError(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    ['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password'].includes(
      error.code
    )
  );
}

async function signInWithKnownPassword(
  seedAuth: ReturnType<typeof getAuth>,
  email: string,
  password: string,
  fallbackPasswords: string[]
): Promise<SeedAuthUser> {
  const passwordsToTry = [password, ...fallbackPasswords].filter(
    (candidate, index, candidates) =>
      candidate.trim().length > 0 && candidates.indexOf(candidate) === index
  );
  let lastError: unknown;

  for (const candidatePassword of passwordsToTry) {
    try {
      const credential = await signInWithEmailAndPassword(seedAuth, email, candidatePassword);

      // Allow demo accounts to keep working after we rotate the shared password in code.
      if (candidatePassword !== password) {
        await updatePassword(credential.user, password);
      }

      return credential.user;
    } catch (error: unknown) {
      if (!isRetryablePasswordError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

async function initializeSeedWallet(userId: string, dbName: ReturnType<typeof getFirestore>) {
  const walletRef = doc(dbName, 'users', userId, 'wallet', WALLET_DOC);

  await runTransaction(dbName, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (walletSnap.exists()) {
      return;
    }

    const starterTxRef = doc(collection(dbName, 'users', userId, 'wallet', WALLET_DOC, 'transactions'));

    transaction.set(walletRef, {
      balance: STARTER_BALANCE,
      lastRequestId: '',
      lastRequestOwnerId: '',
      lastWalletAction: 'starter_bonus',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(starterTxRef, {
      type: 'starter_bonus',
      amount: STARTER_BALANCE,
      reference: 'Starter bonus',
      timestamp: serverTimestamp(),
      balanceAfter: STARTER_BALANCE,
    });
  });
}

function formatSeedError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return error.code.replace('auth/', '').replace('firestore/', '').replaceAll('-', ' ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

async function seedDetailedUserData(
  seedDb: ReturnType<typeof getFirestore>,
  uid: string,
  profile: DetailedDemoUser
): Promise<void> {
  const batch = writeBatch(seedDb);

  batch.set(doc(seedDb, 'users', uid), buildDetailedProfileDocument(uid, profile));
  batch.set(doc(seedDb, 'publicProfiles', uid), {
    ...buildPublicProfileDocument(uid, buildDetailedProfileDocument(uid, profile)),
    ...buildPublicAvailabilitySummary(profile.availabilitySlots),
  });
  batch.set(doc(seedDb, 'users', uid, 'wallet', WALLET_DOC), {
    balance: profile.walletBalance,
    lastRequestId: '',
    lastRequestOwnerId: '',
    lastWalletAction: 'manual_earn',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  profile.walletTransactions.forEach((transaction) => {
    batch.set(doc(seedDb, 'users', uid, 'wallet', WALLET_DOC, 'transactions', transaction.id), {
      type: transaction.type,
      amount: transaction.amount,
      reference: transaction.reference,
      timestamp: serverTimestamp(),
      balanceAfter: transaction.balanceAfter,
    });
  });

  profile.pets.forEach((pet) => {
    batch.set(doc(seedDb, 'users', uid, 'pets', pet.id), {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  profile.availabilitySlots.forEach((slot) => {
    batch.set(doc(seedDb, 'users', uid, 'availabilitySlots', slot.id), {
      startAt: slot.startAt,
      endAt: slot.endAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
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
    const seedApp = initializeApp(firebaseConfig, `test-user-seed-${Date.now()}-${index}`);
    const seedAuth = getAuth(seedApp);
    const seedDb = getFirestore(seedApp);

    try {
      const seedUser = await createOrReuseSeedUser(seedAuth, email, password);
      await seedUser.user.getIdToken();
      await updateProfile(seedUser.user, { displayName: name });

      await setDoc(
        doc(seedDb, 'users', seedUser.uid),
        buildProfileDocument(seedUser.uid, email, name, location, country)
      );
      await setDoc(doc(seedDb, 'publicProfiles', seedUser.uid), {
        ...buildPublicProfileDocument(
          seedUser.uid,
          buildProfileDocument(seedUser.uid, email, name, location, country)
        ),
        ...buildPublicAvailabilitySummary([]),
      });
      await initializeSeedWallet(seedUser.uid, seedDb);

      results.push({
        email,
        password,
        name,
        uid: seedUser.uid,
        status: seedUser.mode,
        message: seedUser.mode === 'created' ? 'Created successfully' : 'Updated existing test user',
      });
    } catch (error: unknown) {
      results.push({
        email,
        password,
        name,
        status: 'failed',
        message: formatSeedError(error),
      });
    } finally {
      await signOut(seedAuth).catch(() => undefined);
      await deleteApp(seedApp).catch(() => undefined);
    }
  }

  return results;
}

export async function seedDetailedDemoUsers(): Promise<TestUserSeedResult[]> {
  const results: TestUserSeedResult[] = [];
  const demoUsers = getDetailedDemoUsers();

  for (const profile of demoUsers) {
    const seedApp = initializeApp(
      firebaseConfig,
      `detailed-demo-user-seed-${Date.now()}-${profile.email}`
    );
    const seedAuth = getAuth(seedApp);
    const seedDb = getFirestore(seedApp);

    try {
      const seedUser = await createOrReuseSeedUser(
        seedAuth,
        profile.email,
        DEMO_USER_PASSWORD,
        LEGACY_DEMO_USER_PASSWORDS
      );
      await seedUser.user.getIdToken();
      await updateProfile(seedUser.user, {
        displayName: profile.name,
        photoURL: profile.photoURL,
      });
      await seedDetailedUserData(seedDb, seedUser.uid, profile);

      results.push({
        email: profile.email,
        password: DEMO_USER_PASSWORD,
        name: profile.name,
        uid: seedUser.uid,
        status: seedUser.mode,
        message:
          seedUser.mode === 'created'
            ? 'Created detailed demo profile'
            : 'Updated detailed demo profile',
      });
    } catch (error: unknown) {
      results.push({
        email: profile.email,
        password: DEMO_USER_PASSWORD,
        name: profile.name,
        status: 'failed',
        message: formatSeedError(error),
      });
    } finally {
      await signOut(seedAuth).catch(() => undefined);
      await deleteApp(seedApp).catch(() => undefined);
    }
  }

  return results;
}
