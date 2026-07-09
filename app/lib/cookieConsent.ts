export const COOKIE_CONSENT_KEY = 'tassukaveri_cookie_consent_v1';
export const COOKIE_CONSENT_EVENT = 'tassukaveri-cookie-consent-change';

export type CookieConsentValue = 'accepted' | 'declined';

export function isCookieConsentValue(value: string | null): value is CookieConsentValue {
  return value === 'accepted' || value === 'declined';
}
