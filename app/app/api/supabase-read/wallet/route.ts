import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
} from '@/lib/supabaseWalletStore';

async function canActorReadWalletForRequest(
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

export async function GET(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (userId !== sessionUser.uid) {
      const requestId = request.nextUrl.searchParams.get('requestId');
      if (!requestId) {
        return NextResponse.json({ error: 'Forbidden wallet read target' }, { status: 403 });
      }

      const allowed = await canActorReadWalletForRequest(sessionUser.uid, userId, requestId);
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden wallet read target' }, { status: 403 });
      }
    }

    const includeTransactions = request.nextUrl.searchParams.get('includeTransactions') === 'true';
    const maxResultsParam = request.nextUrl.searchParams.get('maxResults');
    const parsedMaxResults = maxResultsParam ? Number(maxResultsParam) : undefined;
    const maxResults =
      typeof parsedMaxResults === 'number' && Number.isFinite(parsedMaxResults)
        ? parsedMaxResults
        : undefined;

    const [wallet, transactions] = await Promise.all([
      getWalletFromSupabase(userId),
      includeTransactions ? getWalletTransactionsFromSupabase(userId, maxResults) : Promise.resolve([]),
    ]);

    return NextResponse.json({ wallet, transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected wallet read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

