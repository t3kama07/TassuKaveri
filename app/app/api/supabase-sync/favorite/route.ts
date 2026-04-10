import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { deleteFavoriteInSupabase, upsertFavoriteInSupabase } from '@/lib/supabaseFavoriteStore';

type FavoriteSyncPayload =
  | {
      action?: 'upsert';
      actorId?: string;
      favorite?: {
        id?: string;
        ownerId?: string;
        sitterId?: string;
        createdAt?: string;
      };
    }
  | {
      action: 'delete';
      actorId?: string;
      ownerId?: string;
      sitterId?: string;
    };

function isFavoriteSyncPayload(value: unknown): value is FavoriteSyncPayload {
  return Boolean(value && typeof value === 'object');
}

export async function POST(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (!isFavoriteSyncPayload(payload) || typeof payload.actorId !== 'string') {
      return NextResponse.json({ error: 'Invalid favorite sync payload' }, { status: 400 });
    }

    if (payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for favorite sync' }, { status: 403 });
    }

    if (payload.action === 'delete') {
      if (typeof payload.ownerId !== 'string' || typeof payload.sitterId !== 'string') {
        return NextResponse.json(
          { error: 'ownerId and sitterId are required for favorite delete' },
          { status: 400 }
        );
      }

      if (payload.ownerId !== payload.actorId) {
        return NextResponse.json({ error: 'Forbidden favorite delete target' }, { status: 403 });
      }

      await deleteFavoriteInSupabase(payload.ownerId, payload.sitterId);
      return NextResponse.json({ ok: true });
    }

    if (
      !payload.favorite ||
      typeof payload.favorite.id !== 'string' ||
      typeof payload.favorite.ownerId !== 'string' ||
      typeof payload.favorite.sitterId !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid favorite payload' }, { status: 400 });
    }

    if (payload.favorite.ownerId !== payload.actorId) {
      return NextResponse.json({ error: 'Forbidden favorite sync target' }, { status: 403 });
    }

    await upsertFavoriteInSupabase({
      id: payload.favorite.id,
      ownerId: payload.favorite.ownerId,
      sitterId: payload.favorite.sitterId,
      createdAt: payload.favorite.createdAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected favorite sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

