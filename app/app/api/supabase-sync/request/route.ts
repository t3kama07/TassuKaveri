import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  performRequestAction,
  type RequestActionPayload,
} from '@/lib/serverRequestActions';

function isRequestActionPayload(value: unknown): value is RequestActionPayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'action' in value &&
      typeof (value as { action?: unknown }).action === 'string'
  );
}

function resolveErrorStatus(message: string): number {
  if (/not found/i.test(message)) {
    return 404;
  }
  if (/no longer|already|insufficient|transition/i.test(message)) {
    return 409;
  }
  if (/forbidden|only the|cannot|not allowed|mismatch|another|paused/i.test(message)) {
    return 403;
  }

  return 400;
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
    if (!isRequestActionPayload(payload)) {
      return NextResponse.json({ error: 'Invalid request action payload' }, { status: 400 });
    }

    if (typeof payload.actorId !== 'string' || payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for request action' }, { status: 403 });
    }

    const result = await performRequestAction(sessionUser.uid, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected request action failure';
    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) });
  }
}
