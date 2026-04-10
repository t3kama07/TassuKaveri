import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
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

    const requestedUid = request.nextUrl.searchParams.get('uid') || sessionUser.uid;
    if (requestedUid !== sessionUser.uid) {
      const actorProfile = await getProfileFromSupabase(sessionUser.uid);
      if (!actorProfile || actorProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden profile read target' }, { status: 403 });
      }
    }

    const profile = await getProfileFromSupabase(requestedUid);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected profile read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

