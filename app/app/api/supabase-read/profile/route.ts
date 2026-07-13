import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';

function sanitizeProfileForClient(
  profile: Awaited<ReturnType<typeof getProfileFromSupabase>>
) {
  if (!profile) {
    return null;
  }

  const clientProfile = { ...profile };
  delete clientProfile.phoneVerificationCode;
  delete clientProfile.phoneVerificationExpires;
  return clientProfile;
}

export async function GET(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    // Frozen users may read their own profile so the client can show the
    // account-paused screen. Every other authenticated API rejects them.
    const sessionUser = await verifySessionToken(idToken, { allowFrozen: true });
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
    return NextResponse.json({ profile: sanitizeProfileForClient(profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected profile read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

