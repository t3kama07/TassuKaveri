import { fetchSupabaseReadJson } from './supabaseReadClient';
import { getSupabaseAuthHeaders } from './supabaseAuthClient';
import type { LegalAcceptanceRecord } from '@/types/legalAcceptance';

function mapLegalAcceptance(data: Record<string, unknown>): LegalAcceptanceRecord {
  return {
    userId: (data.userId as string) || '',
    document: data.document as LegalAcceptanceRecord['document'],
    version: (data.version as string) || '',
    acceptedAt:
      typeof data.acceptedAt === 'string' || typeof data.acceptedAt === 'number'
        ? new Date(data.acceptedAt)
        : new Date(),
  };
}

export async function getLegalAcceptanceStatus(userId: string): Promise<{
  accepted: boolean;
  acceptances: LegalAcceptanceRecord[];
}> {
  const payload = await fetchSupabaseReadJson<{
    accepted: boolean;
    acceptances: Array<Record<string, unknown>>;
  }>(`/api/supabase-read/legal-acceptance?userId=${encodeURIComponent(userId)}`, {
    requireAuth: true,
  });

  return {
    accepted: payload.accepted,
    acceptances: payload.acceptances.map(mapLegalAcceptance),
  };
}

export async function acceptLatestLegalDocuments(userId: string): Promise<void> {
  const response = await fetch('/api/supabase-sync/legal-acceptance', {
    method: 'POST',
    headers: {
      ...(await getSupabaseAuthHeaders(userId)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || 'Legal acceptance failed');
  }
}
