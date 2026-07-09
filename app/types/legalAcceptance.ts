import type { LegalDocument } from '@/lib/legalPolicy';

export interface LegalAcceptanceRecord {
  userId: string;
  document: LegalDocument;
  version: string;
  acceptedAt: Date;
}
