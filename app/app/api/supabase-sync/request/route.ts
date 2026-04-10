import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  deleteRequestInSupabase,
  type SupabaseRequestInput,
  upsertRequestInSupabase,
} from '@/lib/supabaseRequestStore';

type RequestSyncPayload =
  | {
      action?: 'upsert';
      actorId?: string;
      request?: Partial<SupabaseRequestInput>;
    }
  | {
      action: 'delete';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
    };

function isRequestSyncPayload(value: unknown): value is RequestSyncPayload {
  return Boolean(value && typeof value === 'object');
}

function isRequestUpsertPayload(
  value: RequestSyncPayload
): value is {
  action?: 'upsert';
  actorId?: string;
  request: Partial<SupabaseRequestInput>;
} {
  return 'request' in value && Boolean(value.request && typeof value.request === 'object');
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
    if (!isRequestSyncPayload(payload)) {
      return NextResponse.json({ error: 'Invalid request sync payload' }, { status: 400 });
    }

    if (typeof payload.actorId === 'string' && payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for request sync' }, { status: 403 });
    }

    if (payload.action === 'delete') {
      if (typeof payload.ownerId !== 'string' || typeof payload.requestId !== 'string') {
        return NextResponse.json({ error: 'ownerId and requestId are required' }, { status: 400 });
      }

      await deleteRequestInSupabase(payload.ownerId, payload.requestId);
      return NextResponse.json({ ok: true });
    }

    if (!isRequestUpsertPayload(payload)) {
      return NextResponse.json({ error: 'Request payload is required' }, { status: 400 });
    }

    const nextRequest = payload.request;
    if (
      typeof nextRequest.id !== 'string' ||
      typeof nextRequest.ownerId !== 'string' ||
      typeof nextRequest.ownerName !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Request id, ownerId, and ownerName are required' },
        { status: 400 }
      );
    }

    await upsertRequestInSupabase(nextRequest as SupabaseRequestInput);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected request sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

