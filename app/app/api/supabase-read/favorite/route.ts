import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { getFavoritesByOwnerFromSupabase } from '@/lib/supabaseFavoriteStore';

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

    const ownerId = request.nextUrl.searchParams.get('ownerId');
    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
    }

    if (ownerId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden favorite read target' }, { status: 403 });
    }

    const favorites = await getFavoritesByOwnerFromSupabase(ownerId);
    return NextResponse.json({ favorites });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected favorite read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

