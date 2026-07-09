import { LEGAL_DOCUMENT_VERSIONS, type LegalDocument } from './legalPolicy';
import { createSupabaseAdminClient } from './supabaseAdmin';
import type { LegalAcceptanceRecord } from '@/types/legalAcceptance';

type SupabaseLegalAcceptanceRow = {
  user_uid: string;
  document: LegalDocument;
  version: string;
  accepted_at: string;
};

function toDate(value: unknown): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function mapRow(row: SupabaseLegalAcceptanceRow): LegalAcceptanceRecord {
  return {
    userId: row.user_uid,
    document: row.document,
    version: row.version,
    acceptedAt: toDate(row.accepted_at),
  };
}

export async function getLegalAcceptancesFromSupabase(
  userId: string
): Promise<LegalAcceptanceRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('*')
    .eq('user_uid', userId)
    .returns<SupabaseLegalAcceptanceRow[]>();

  if (error) {
    throw new Error(`Failed to read legal acceptances: ${error.message}`);
  }

  return (data || []).map(mapRow);
}

export async function upsertLegalAcceptancesInSupabase(userId: string): Promise<void> {
  const acceptedAt = new Date().toISOString();
  const rows = Object.entries(LEGAL_DOCUMENT_VERSIONS).map(([document, version]) => ({
    user_uid: userId,
    document,
    version,
    accepted_at: acceptedAt,
  }));

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('legal_acceptances')
    .upsert(rows, { onConflict: 'user_uid,document,version' });

  if (error) {
    throw new Error(`Failed to save legal acceptances: ${error.message}`);
  }
}

export function hasAcceptedLatestLegalDocuments(records: LegalAcceptanceRecord[]): boolean {
  return Object.entries(LEGAL_DOCUMENT_VERSIONS).every(([document, version]) =>
    records.some((record) => record.document === document && record.version === version)
  );
}
