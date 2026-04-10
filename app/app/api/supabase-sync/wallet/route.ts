import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { replaceWalletStateInSupabase } from '@/lib/supabaseWalletStore';

type WalletSyncPayload = {
  actorId?: string;
  userId?: string;
  requestId?: string;
  wallet?: Record<string, unknown>;
  transactions?: Array<Record<string, unknown>>;
};

function isWalletSyncPayload(value: unknown): value is WalletSyncPayload {
  return Boolean(value && typeof value === 'object');
}

async function canActorSyncWalletForRequest(
  actorId: string,
  userId: string,
  requestId: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('owner_uid, sitter_uid, requested_sitter_uid')
    .eq('id', requestId)
    .maybeSingle<{
      owner_uid: string;
      sitter_uid: string | null;
      requested_sitter_uid: string | null;
    }>();

  if (error || !data) {
    return false;
  }

  const actorIsParticipant =
    actorId === data.owner_uid ||
    actorId === data.sitter_uid ||
    actorId === data.requested_sitter_uid;

  const targetWalletBelongsToParticipant =
    userId === data.owner_uid || userId === data.sitter_uid;

  return actorIsParticipant && targetWalletBelongsToParticipant;
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
    if (
      !isWalletSyncPayload(payload) ||
      typeof payload.actorId !== 'string' ||
      typeof payload.userId !== 'string' ||
      !payload.wallet ||
      !Array.isArray(payload.transactions)
    ) {
      return NextResponse.json({ error: 'Invalid wallet sync payload' }, { status: 400 });
    }

    if (payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for wallet sync' }, { status: 403 });
    }

    if (payload.userId !== payload.actorId) {
      if (typeof payload.requestId !== 'string') {
        return NextResponse.json(
          { error: 'requestId is required when syncing another user wallet' },
          { status: 403 }
        );
      }

      const allowed = await canActorSyncWalletForRequest(
        payload.actorId,
        payload.userId,
        payload.requestId
      );

      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden wallet sync target' }, { status: 403 });
      }
    }

    await replaceWalletStateInSupabase({
      userId: payload.userId,
      wallet: payload.wallet as never,
      transactions: payload.transactions as never,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected wallet sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

