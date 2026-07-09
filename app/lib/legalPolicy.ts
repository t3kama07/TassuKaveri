export const LEGAL_DOCUMENT_VERSIONS = {
  terms_of_service: '2026-07-05',
  privacy_policy: '2026-07-05',
} as const;

export type LegalDocument = keyof typeof LEGAL_DOCUMENT_VERSIONS;

export const PLATFORM_ROLE_NOTICE =
  'TassuKaveri helps pet owners and pet carers connect. The pet-care arrangement is made directly between the users. Before confirming, discuss the pet needs, behaviour, medication, emergency contacts, home access, credits, insurance, and other care conditions.';

export const PLATFORM_ROLE_ACKNOWLEDGEMENT =
  'I understand that TassuKaveri is a connection platform and that the pet-care arrangement is made directly between the pet owner and the pet carer.';

export const EMAIL_VERIFICATION_EXPLANATION =
  'This confirms that the user has access to the provided email address. It does not confirm their identity, background, experience, reliability, or suitability.';

export const MEET_AND_GREET_RECOMMENDATION =
  'For your safety and your pet wellbeing, we recommend arranging a meet-and-greet before confirming the first pet-care arrangement. This is a recommendation, not a guarantee from TassuKaveri.';
