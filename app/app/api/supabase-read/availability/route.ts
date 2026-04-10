import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { getAvailabilitySlotsFromSupabase } from '@/lib/supabaseAvailabilityStore';

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

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const slots = await getAvailabilitySlotsFromSupabase(userId);
    return NextResponse.json({ slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected availability read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

