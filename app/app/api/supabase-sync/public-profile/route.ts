import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { upsertPublicProfileInSupabase } from '@/lib/supabasePublicProfileStore';

function isPublicProfilePayload(
  value: unknown
): value is { publicProfile: { uid?: string } } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'publicProfile' in value &&
      value.publicProfile &&
      typeof value.publicProfile === 'object'
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
    if (!isPublicProfilePayload(payload)) {
      return NextResponse.json({ error: 'Invalid public profile payload' }, { status: 400 });
    }

    const publicProfile = payload.publicProfile;
    if (typeof publicProfile.uid !== 'string') {
      return NextResponse.json({ error: 'Public profile uid is required' }, { status: 400 });
    }

    if (publicProfile.uid !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden public profile sync target' }, { status: 403 });
    }

    await upsertPublicProfileInSupabase({
      ...publicProfile,
      uid: publicProfile.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected public profile sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

