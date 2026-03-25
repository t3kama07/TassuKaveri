import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';

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

const demoEmails = [
  'user1@gmail.com',
  'user2@gmail.com',
  'user3@gmail.com',
  'user4@gmail.com',
  'user5@gmail.com',
  'user6@gmail.com',
];

const newSharedPassword = 'test123';
const legacySharedPasswords = ['PetBuddy123!'];

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

async function main() {
  const results = [];

  for (const email of demoEmails) {
    const seedApp = initializeApp(firebaseConfig, `rotate-demo-password-${Date.now()}-${email}`);
    const seedAuth = getAuth(seedApp);

    try {
      const user = await signInWithKnownPassword(
        seedAuth,
        email,
        newSharedPassword,
        legacySharedPasswords
      );
      results.push({
        email,
        password: newSharedPassword,
        uid: user.uid,
        status: 'updated',
      });
    } catch (error) {
      results.push({
        email,
        password: newSharedPassword,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      await signOut(seedAuth).catch(() => undefined);
      await deleteApp(seedApp).catch(() => undefined);
    }
  }

  console.table(results);

  if (results.some((entry) => entry.status === 'failed')) {
    process.exitCode = 1;
  }
}

await main();
