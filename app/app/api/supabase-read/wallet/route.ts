import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
} from '@/lib/supabaseWalletStore';

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
      return NextResponse.json({ error: 'Forbidden wallet read target' }, { status: 403 });
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

