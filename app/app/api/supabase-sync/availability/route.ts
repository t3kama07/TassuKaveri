import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { replaceAvailabilitySlotsInSupabase } from '@/lib/supabaseAvailabilityStore';

type AvailabilitySyncPayload = {
  userId?: string;
  slots?: Array<{ id?: string; userId?: string; startAt?: string; endAt?: string }>;
};

function isAvailabilitySyncPayload(value: unknown): value is AvailabilitySyncPayload {
  return Boolean(value && typeof value === 'object');
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
    if (!isAvailabilitySyncPayload(payload) || typeof payload.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid availability sync payload' }, { status: 400 });
    }

    if (payload.userId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Forbidden availability sync target' }, { status: 403 });
    }

    const slots = Array.isArray(payload.slots)
      ? payload.slots.filter(
          (
            slot
          ): slot is { id: string; userId: string; startAt: string; endAt: string } =>
            Boolean(
              slot &&
                typeof slot === 'object' &&
                typeof slot.id === 'string' &&
                typeof slot.userId === 'string' &&
                typeof slot.startAt === 'string' &&
                typeof slot.endAt === 'string'
            )
        )
      : [];

    const allSlotsBelongToUser = slots.every((slot) => slot.userId === payload.userId);
    if (!allSlotsBelongToUser) {
      return NextResponse.json({ error: 'Availability slot owner mismatch' }, { status: 400 });
    }

    await replaceAvailabilitySlotsInSupabase(payload.userId, slots);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected availability sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

