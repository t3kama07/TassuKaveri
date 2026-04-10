import { FavoriteSitter } from '@/types/favorite';
import { PublicUserProfile } from '@/types/profile';
import { getPublicProfile } from './publicProfileService';
import { deleteFavoriteFromSupabase, mirrorFavoriteToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function generateFavoriteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date();
}

export async function addFavoriteSitter(ownerId: string, sitterId: string): Promise<void> {
  if (ownerId === sitterId) {
    throw new Error('You cannot favorite yourself');
  }

  const existingFavorites = await getFavoriteSitters(ownerId);
  const alreadyFavorited = existingFavorites.some((favorite) => favorite.sitterId === sitterId);
  if (alreadyFavorited) {
    return;
  }

  await mirrorFavoriteToSupabase({
    actorId: ownerId,
    favorite: {
      id: generateFavoriteId(),
      ownerId,
      sitterId,
      createdAt: new Date(),
    },
  });
}

export async function removeFavoriteSitter(ownerId: string, sitterId: string): Promise<void> {
  await deleteFavoriteFromSupabase({
    actorId: ownerId,
    ownerId,
    sitterId,
  });
}

export async function getFavoriteSitters(ownerId: string): Promise<FavoriteSitter[]> {
  const payload = await fetchSupabaseReadJson<{ favorites: Array<Record<string, unknown>> }>(
    `/api/supabase-read/favorite?ownerId=${encodeURIComponent(ownerId)}`,
    { requireAuth: true }
  );

  return payload.favorites.map((favorite) => ({
    id: (favorite.id as string) || '',
    ownerId: (favorite.ownerId as string) || ownerId,
    sitterId: (favorite.sitterId as string) || '',
    createdAt: toDate(favorite.createdAt),
  }));
}

export async function getFavoriteSitterProfiles(ownerId: string): Promise<PublicUserProfile[]> {
  const favorites = await getFavoriteSitters(ownerId);
  const profiles = await Promise.all(favorites.map((favorite) => getPublicProfile(favorite.sitterId)));
  return profiles.filter((profile): profile is PublicUserProfile => profile !== null);
}
