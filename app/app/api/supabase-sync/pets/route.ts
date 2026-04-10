import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  deletePetsInSupabase,
  replaceOwnerPetsInSupabase,
  upsertPetsInSupabase,
} from '@/lib/supabasePetStore';

type PetsSyncPayload =
  | {
      action?: 'upsert' | 'replace';
      ownerId?: string;
      pets?: Array<{ id?: string; ownerId?: string }>;
    }
  | {
      action: 'delete';
      ownerId?: string;
      petIds?: string[];
    };

function isPetsSyncPayload(value: unknown): value is PetsSyncPayload {
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
    if (!isPetsSyncPayload(payload) || typeof payload.ownerId !== 'string') {
      return NextResponse.json({ error: 'Invalid pet sync payload' }, { status: 400 });
    }

    if (payload.ownerId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden pet sync target' }, { status: 403 });
    }

    if (payload.action === 'delete') {
      const petIds = Array.isArray(payload.petIds)
        ? payload.petIds.filter((petId): petId is string => typeof petId === 'string')
        : [];
      await deletePetsInSupabase(payload.ownerId, petIds);
      return NextResponse.json({ ok: true });
    }

    const pets = Array.isArray(payload.pets)
      ? payload.pets.filter(
          (pet): pet is { id: string; ownerId: string } =>
            Boolean(
              pet &&
                typeof pet === 'object' &&
                typeof pet.id === 'string' &&
                typeof pet.ownerId === 'string'
            )
        )
      : [];

    const allPetsBelongToOwner = pets.every((pet) => pet.ownerId === payload.ownerId);
    if (!allPetsBelongToOwner) {
      return NextResponse.json({ error: 'Pet owner mismatch in sync payload' }, { status: 400 });
    }

    if (payload.action === 'replace') {
      await replaceOwnerPetsInSupabase(payload.ownerId, pets);
    } else {
      await upsertPetsInSupabase(pets);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected pet sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

