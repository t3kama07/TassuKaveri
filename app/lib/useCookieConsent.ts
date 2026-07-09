'use client';

import { useSyncExternalStore } from 'react';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, isCookieConsentValue, type CookieConsentValue } from './cookieConsent';

export type CookieConsentSnapshot = CookieConsentValue | 'unset';

function readConsent(): CookieConsentSnapshot {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return isCookieConsentValue(stored) ? stored : 'unset';
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, callback);
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useCookieConsent(): CookieConsentSnapshot {
  return useSyncExternalStore(subscribeToConsent, readConsent, () => 'unset');
}
