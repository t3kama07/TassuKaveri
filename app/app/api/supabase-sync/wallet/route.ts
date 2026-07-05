import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getTodayKey } from '@/lib/platformPolicy';
import { getRequestByIdOnlyFromSupabase } from '@/lib/supabaseRequestStore';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
  replaceWalletStateInSupabase,
} from '@/lib/supabaseWalletStore';
import type { Transaction, Wallet } from '@/types/wallet';

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

function buildTransaction(params: {
  type: Transaction['type'];
  amount: number;
  requestId?: string;
  reference: string;
  balanceAfter: number;
}): Transaction {
  return {
    id: crypto.randomUUID(),
    type: params.type,
    amount: params.amount,
    requestId: params.requestId,
    reference: params.reference,
    balanceAfter: params.balanceAfter,
    timestamp: new Date(),
  };
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

    const currentWallet = await getWalletFromSupabase(payload.userId);
    if (!currentWallet) {
      if (payload.userId !== payload.actorId || payload.requestId) {
        return NextResponse.json({ error: 'Only a user can initialize their own wallet' }, { status: 403 });
      }

      const now = new Date();
      const starterBalance = 5;
      await replaceWalletStateInSupabase({
        userId: payload.userId,
        wallet: {
          balance: starterBalance,
          lastRequestId: '',
          lastRequestOwnerId: '',
          dailyEarnedDate: undefined,
          dailyEarnedCredits: 0,
          lastWalletAction: 'starter_bonus',
          createdAt: now,
          updatedAt: now,
        },
        transactions: [
          buildTransaction({
            type: 'starter_bonus',
            amount: starterBalance,
            reference: 'Starter bonus',
            balanceAfter: starterBalance,
          }),
        ],
      });
      return NextResponse.json({ ok: true });
    }

    if (typeof payload.requestId !== 'string') {
      return NextResponse.json(
        { error: 'Existing wallets can be changed only by a pet-care request' },
        { status: 403 }
      );
    }

    if (payload.userId !== payload.actorId) {
      const allowed = await canActorSyncWalletForRequest(
        payload.actorId,
        payload.userId,
        payload.requestId
      );

      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden wallet sync target' }, { status: 403 });
      }
    }

    const relatedRequest = await getRequestByIdOnlyFromSupabase(payload.requestId);
    if (!relatedRequest) {
      return NextResponse.json({ error: 'Related request not found' }, { status: 404 });
    }

    const requestedAction = (payload.wallet as Partial<Wallet>).lastWalletAction;
    const transactions = await getWalletTransactionsFromSupabase(payload.userId);
    const actionConfig =
      requestedAction === 'escrow_hold'
        ? {
            transactionType: 'escrow' as const,
            allowed:
              payload.userId === relatedRequest.ownerId &&
              (relatedRequest.status === 'open' || relatedRequest.status === 'accepted') &&
              relatedRequest.escrowStatus === 'held' &&
              (payload.actorId === relatedRequest.ownerId || payload.actorId === relatedRequest.sitterId),
            balanceDelta: -relatedRequest.creditsOffered,
            reference: `Escrow for request ${payload.requestId}`,
          }
        : requestedAction === 'escrow_release'
          ? {
              transactionType: 'escrow-release' as const,
              allowed:
                payload.userId === relatedRequest.sitterId &&
                payload.actorId === relatedRequest.ownerId &&
                relatedRequest.escrowStatus === 'released' &&
                (relatedRequest.status === 'completed' ||
                  (relatedRequest.status === 'cancelled' &&
                    relatedRequest.cancellationCreditOutcome === 'sitter_paid')),
              balanceDelta: relatedRequest.creditsOffered,
              reference:
                relatedRequest.status === 'cancelled'
                  ? `Late cancellation reward for request ${payload.requestId}`
                  : `Reward completed for request ${payload.requestId}`,
            }
          : requestedAction === 'escrow_refund'
            ? {
                transactionType: 'escrow-refund' as const,
                allowed:
                  payload.userId === relatedRequest.ownerId &&
                  relatedRequest.status === 'cancelled' &&
                  relatedRequest.escrowStatus === 'refunded' &&
                  (payload.actorId === relatedRequest.ownerId || payload.actorId === relatedRequest.sitterId),
                balanceDelta: relatedRequest.creditsOffered,
                reference: `Refund for cancelled request ${payload.requestId}`,
              }
            : null;

    if (!actionConfig?.allowed || relatedRequest.creditsOffered <= 0) {
      return NextResponse.json({ error: 'Invalid wallet operation for request state' }, { status: 403 });
    }

    if (
      transactions.some(
        (transaction) =>
          transaction.requestId === payload.requestId && transaction.type === actionConfig.transactionType
      )
    ) {
      return NextResponse.json({ ok: true });
    }

    const nextBalance = currentWallet.balance + actionConfig.balanceDelta;
    if (nextBalance < 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 409 });
    }

    const now = new Date();
    await replaceWalletStateInSupabase({
      userId: payload.userId,
      wallet: {
        ...currentWallet,
        balance: nextBalance,
        lastRequestId: payload.requestId,
        lastRequestOwnerId:
          requestedAction === 'escrow_release' ? '' : relatedRequest.ownerId,
        dailyEarnedCredits:
          requestedAction === 'escrow_release'
            ? (currentWallet.dailyEarnedCredits ?? 0) + relatedRequest.creditsOffered
            : currentWallet.dailyEarnedCredits,
        dailyEarnedDate:
          requestedAction === 'escrow_release'
            ? getTodayKey(now)
            : currentWallet.dailyEarnedDate,
        lastWalletAction: requestedAction,
        updatedAt: now,
      },
      transactions: [
        buildTransaction({
          type: actionConfig.transactionType,
          amount: relatedRequest.creditsOffered,
          requestId: payload.requestId,
          reference: actionConfig.reference,
          balanceAfter: nextBalance,
        }),
        ...transactions,
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected wallet sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

