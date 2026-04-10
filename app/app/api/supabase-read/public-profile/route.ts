import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailablePublicProfilesFromSupabase,
  getPublicProfileFromSupabase,
} from '@/lib/supabasePublicProfileStore';

export async function GET(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get('uid');
    const available = request.nextUrl.searchParams.get('available');

    if (uid) {
      const profile = await getPublicProfileFromSupabase(uid);
      return NextResponse.json({ profile });
    }

    if (available === 'true') {
      const profiles = await getAvailablePublicProfilesFromSupabase();
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

