import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { getOwnerPetsFromSupabase, getPetFromSupabase } from '@/lib/supabasePetStore';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';

export async function GET(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const ownerId = request.nextUrl.searchParams.get('ownerId') || sessionUser.uid;
    if (ownerId !== sessionUser.uid) {
      const actorProfile = await getProfileFromSupabase(sessionUser.uid);
      if (!actorProfile || actorProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden pet read target' }, { status: 403 });
      }
    }

    const petId = request.nextUrl.searchParams.get('petId');
    if (petId) {
      const pet = await getPetFromSupabase(ownerId, petId);
      return NextResponse.json({ pet });
    }

    const pets = await getOwnerPetsFromSupabase(ownerId);
    return NextResponse.json({ pets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected pet read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

