import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { upsertProfileInSupabase } from '@/lib/supabaseProfileStore';

function isProfilePayload(
  value: unknown
): value is { profile: { uid?: string; email?: string } } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'profile' in value &&
      value.profile &&
      typeof value.profile === 'object'
  );
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
    if (!isProfilePayload(payload)) {
      return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });
    }

    const profile = payload.profile;
    if (typeof profile.uid !== 'string' || typeof profile.email !== 'string') {
      return NextResponse.json({ error: 'Profile uid and email are required' }, { status: 400 });
    }

    if (profile.uid !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden profile sync target' }, { status: 403 });
    }

    await upsertProfileInSupabase({
      ...profile,
      uid: profile.uid,
      email: profile.email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected profile sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

