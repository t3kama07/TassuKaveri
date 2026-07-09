import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { upsertLegalAcceptancesInSupabase } from '@/lib/supabaseLegalAcceptanceStore';

function isLegalAcceptancePayload(value: unknown): value is { userId?: string } {
  return Boolean(value && typeof value === 'object' && 'userId' in value);
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request.headers);
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(accessToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (!isLegalAcceptancePayload(payload) || typeof payload.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid legal acceptance payload' }, { status: 400 });
    }

    if (payload.userId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden legal acceptance target' }, { status: 403 });
    }

    await upsertLegalAcceptancesInSupabase(payload.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected legal acceptance sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
