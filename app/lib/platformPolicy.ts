export const PILOT_CITY = 'Oulu';
export const PILOT_COUNTRY = 'Finland';
export const PILOT_COORDINATES = {
  latitude: 65.0121,
  longitude: 25.4651,
} as const;

export const DEFAULT_RADIUS_KM = 5;
export const MAX_EARNED_CREDITS_PER_DAY = 20;
export const REPEATED_PAIR_ACTIVITY_THRESHOLD = 3;
export const MONEY_BLOCK_ERROR = 'Money is not allowed on this platform';

const MONEY_PATTERNS = [
  /€/i,
  /\beuro\b/i,
  /\bcash\b/i,
  /\bmoney\b/i,
  /\bpay\b/i,
];

export function containsMoneyLanguage(value: string): boolean {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return false;
  }

  return MONEY_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

export function assertNoMoneyLanguage(...values: Array<string | undefined | null>): void {
  const hasBlockedLanguage = values.some((value) =>
    typeof value === 'string' ? containsMoneyLanguage(value) : false
  );

  if (hasBlockedLanguage) {
    throw new Error(MONEY_BLOCK_ERROR);
  }
}

export function getPilotLocationPayload() {
  return {
    location: PILOT_CITY,
    country: PILOT_COUNTRY,
    latitude: PILOT_COORDINATES.latitude,
    longitude: PILOT_COORDINATES.longitude,
  };
}

export function getTodayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
