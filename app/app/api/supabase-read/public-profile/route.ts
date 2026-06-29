import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailablePublicProfilesFromSupabase,
  getPublicProfileFromSupabase,
} from '@/lib/supabasePublicProfileStore';

const DEFAULT_AVAILABLE_PROFILE_LIMIT = 50;
const MAX_AVAILABLE_PROFILE_LIMIT = 100;

function parseBoundedLimit(value: string | null): number {
  const parsed = value ? Number(value) : DEFAULT_AVAILABLE_PROFILE_LIMIT;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_AVAILABLE_PROFILE_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_AVAILABLE_PROFILE_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get('uid');
    const available = request.nextUrl.searchParams.get('available');

    if (uid) {
      const profile = await getPublicProfileFromSupabase(uid);
      return NextResponse.json({ profile });
    }

    if (available === 'true') {
      const city = request.nextUrl.searchParams.get('city') || undefined;
      const limit = parseBoundedLimit(request.nextUrl.searchParams.get('limit'));
      const profiles = await getAvailablePublicProfilesFromSupabase({ city, limit });
      return NextResponse.json({ profiles });
    }

    return NextResponse.json(
      { error: 'Specify uid or available=true' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected public profile read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

