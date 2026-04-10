import { FavoriteSitter } from '@/types/favorite';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;
type SupabaseFavoriteRow = {
  id: string;
  owner_uid: string;
  sitter_uid: string;
  created_at: string;
};

export type SupabaseFavoriteInput = Omit<FavoriteSitter, 'createdAt'> & {
  createdAt?: DateInput;
};

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapFavoriteToSupabaseRow(favorite: SupabaseFavoriteInput): Record<string, unknown> {
  return {
    id: favorite.id,
    owner_uid: favorite.ownerId,
    sitter_uid: favorite.sitterId,
    created_at: toIsoString(favorite.createdAt, new Date()),
  };
}

export async function upsertFavoriteInSupabase(favorite: SupabaseFavoriteInput): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('favorites')
    .upsert(mapFavoriteToSupabaseRow(favorite), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert favorite in Supabase: ${error.message}`);
  }
}

export async function deleteFavoriteInSupabase(
  ownerId: string,
  sitterId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('owner_uid', ownerId)
    .eq('sitter_uid', sitterId);

  if (error) {
    throw new Error(`Failed to delete favorite in Supabase: ${error.message}`);
  }
}

function mapSupabaseFavoriteRow(row: SupabaseFavoriteRow): FavoriteSitter {
  return {
    id: row.id,
    ownerId: row.owner_uid,
    sitterId: row.sitter_uid,
    createdAt: toDate(row.created_at),
  };
}

export async function getFavoritesByOwnerFromSupabase(
  ownerId: string
): Promise<FavoriteSitter[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('owner_uid', ownerId)
    .order('created_at', { ascending: false })
    .returns<SupabaseFavoriteRow[]>();

  if (error) {
    throw new Error(`Failed to read favorites from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseFavoriteRow);
}
