export type GoogleAuthIntent = 'login' | 'signup';

const SESSION_STORAGE_KEY = 'tassukaveri_google_auth_intent';
const LOCAL_STORAGE_KEY = 'tassukaveri_google_auth_intent_pending';
const MAX_INTENT_AGE_MS = 60 * 60 * 1000;

type StoredGoogleAuthIntent = {
  intent: GoogleAuthIntent;
  createdAt: number;
};

function isGoogleAuthIntent(value: unknown): value is GoogleAuthIntent {
  return value === 'login' || value === 'signup';
}

function parseStoredIntent(value: string | null): GoogleAuthIntent | null {
  if (!value) return null;
  if (isGoogleAuthIntent(value)) return value;

  try {
    const stored = JSON.parse(value) as Partial<StoredGoogleAuthIntent>;
    if (
      isGoogleAuthIntent(stored.intent) &&
      typeof stored.createdAt === 'number' &&
      Date.now() - stored.createdAt <= MAX_INTENT_AGE_MS
    ) {
      return stored.intent;
    }
  } catch {
    // Ignore invalid or expired browser state.
  }

  return null;
}

export function markGoogleAuthIntent(intent: GoogleAuthIntent): void {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify({ intent, createdAt: Date.now() } satisfies StoredGoogleAuthIntent);
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, intent);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
}

export function getGoogleAuthIntent(): GoogleAuthIntent | null {
  if (typeof window === 'undefined') return null;

  if (window.location.pathname === '/auth/callback') {
    const queryIntent = new URLSearchParams(window.location.search).get('intent');
    if (isGoogleAuthIntent(queryIntent)) return queryIntent;
  }

  return (
    parseStoredIntent(window.sessionStorage.getItem(SESSION_STORAGE_KEY)) ||
    parseStoredIntent(window.localStorage.getItem(LOCAL_STORAGE_KEY))
  );
}

export function clearGoogleAuthIntent(): void {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}
