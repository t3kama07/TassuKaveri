import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getLegalAcceptancesFromSupabase,
  hasAcceptedLatestLegalDocuments,
} from '@/lib/supabaseLegalAcceptanceStore';

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request.headers);
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(accessToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId') || sessionUser.uid;
    if (userId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden legal acceptance target' }, { status: 403 });
    }

    const acceptances = await getLegalAcceptancesFromSupabase(userId);
    return NextResponse.json({
      accepted: hasAcceptedLatestLegalDocuments(acceptances),
      acceptances,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected legal acceptance read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
