import { LEGAL_DOCUMENT_VERSIONS } from './legalPolicy';

const SESSION_STORAGE_KEY = 'tassukaveri_google_signup_legal_accepted';
const LOCAL_STORAGE_KEY = 'tassukaveri_google_signup_legal_pending';
const MAX_PENDING_AGE_MS = 60 * 60 * 1000;

type PendingGoogleSignupConsent = {
  termsVersion: string;
  privacyVersion: string;
  createdAt: number;
};

function isCurrentConsent(value: string | null): boolean {
  if (!value) return false;

  // Keep an in-progress signup from the previous implementation working.
  if (value === 'true') return true;

  try {
    const consent = JSON.parse(value) as Partial<PendingGoogleSignupConsent>;
    return (
      consent.termsVersion === LEGAL_DOCUMENT_VERSIONS.terms_of_service &&
      consent.privacyVersion === LEGAL_DOCUMENT_VERSIONS.privacy_policy &&
      typeof consent.createdAt === 'number' &&
      Date.now() - consent.createdAt <= MAX_PENDING_AGE_MS
    );
  } catch {
    return false;
  }
}

export function markPendingGoogleSignupConsent(): void {
  if (typeof window === 'undefined') return;

  const consent: PendingGoogleSignupConsent = {
    termsVersion: LEGAL_DOCUMENT_VERSIONS.terms_of_service,
    privacyVersion: LEGAL_DOCUMENT_VERSIONS.privacy_policy,
    createdAt: Date.now(),
  };
  const serializedConsent = JSON.stringify(consent);

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, serializedConsent);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, serializedConsent);
}

export function hasPendingGoogleSignupConsent(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    isCurrentConsent(window.sessionStorage.getItem(SESSION_STORAGE_KEY)) ||
    isCurrentConsent(window.localStorage.getItem(LOCAL_STORAGE_KEY))
  );
}

export function clearPendingGoogleSignupConsent(): void {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}
