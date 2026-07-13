import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { calculateTrustScore } from '@/lib/trustScore';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  updateReportStatusInSupabase,
  upsertReportInSupabase,
  type SupabaseReportInput,
} from '@/lib/supabaseModerationStore';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';
import {
  getWalletFromSupabase,
  getWalletTransactionsFromSupabase,
  replaceWalletStateInSupabase,
} from '@/lib/supabaseWalletStore';
import {
  getCompletedSitsCountFromSupabase,
  getRequestByIdFromSupabase,
  getSitterRequestsFromSupabase,
  upsertRequestInSupabase,
} from '@/lib/supabaseRequestStore';
import type { Transaction, Wallet } from '@/types/wallet';

type ModerationPayload =
  | {
      action: 'create-report';
      actorId?: string;
      report?: Partial<SupabaseReportInput>;
    }
  | {
      action: 'freeze-account';
      actorId?: string;
      targetUserId?: string;
      reason?: string;
    }
  | {
      action: 'set-account-frozen';
      actorId?: string;
      targetUserId?: string;
      frozen?: boolean;
      reason?: string;
    }
  | {
      action: 'update-report-status';
      actorId?: string;
      reportId?: string;
      status?: 'open' | 'resolved' | 'dismissed';
    }
  | {
      action: 'delete-review';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
    }
  | {
      action: 'adjust-credits';
      actorId?: string;
      targetUserId?: string;
      amount?: number;
      direction?: 'add' | 'deduct';
      reason?: string;
    };

function isModerationPayload(value: unknown): value is ModerationPayload {
  return Boolean(value && typeof value === 'object' && 'action' in value);
}

async function assertAdmin(adminId: string) {
  const profile = await getProfileFromSupabase(adminId);
  if (!profile || profile.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

async function assertCanFreezeAccount(targetUserId: string) {
  const profile = await getProfileFromSupabase(targetUserId);
  if (profile?.role === 'admin') {
    throw new Error('Admin accounts cannot be frozen');
  }
}

async function setAccountFrozenWithAudit(params: {
  adminId: string;
  targetUserId: string;
  frozen: boolean;
  reason: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('set_account_frozen_with_audit', {
    p_admin_uid: params.adminId,
    p_target_user_uid: params.targetUserId,
    p_frozen: params.frozen,
    p_reason: params.reason,
  });

  if (error) {
    throw new Error(`Failed to update frozen account status: ${error.message}`);
  }
}

function getReviewMetrics(requests: Awaited<ReturnType<typeof getSitterRequestsFromSupabase>>) {
  const reviews = requests
    .filter((request) => request.status === 'completed' && Boolean(request.ownerReview ?? request.review))
    .map((request) => request.ownerReview ?? request.review)
    .filter((review): review is NonNullable<typeof review> => Boolean(review));

  const ratingCount = reviews.length;
  const ratingAverage =
    ratingCount > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
      : 0;

  return {
    ratingCount,
    ratingAverage,
  };
}

function buildAdminCreditTransaction(params: {
  direction: 'add' | 'deduct';
  amount: number;
  reference: string;
  balanceAfter: number;
}): Transaction {
  return {
    id: crypto.randomUUID(),
    type: params.direction === 'add' ? 'earn' : 'spend',
    amount: params.amount,
    reference: params.reference,
    balanceAfter: params.balanceAfter,
    timestamp: new Date(),
  };
}

async function adjustUserCredits(params: {
  targetUserId: string;
  amount: number;
  direction: 'add' | 'deduct';
  reason?: string;
}): Promise<number> {
  const now = new Date();
  const currentWallet = await getWalletFromSupabase(params.targetUserId);
  const currentBalance = currentWallet?.balance ?? 0;
  const balanceDelta = params.direction === 'add' ? params.amount : -params.amount;
  const nextBalance = currentBalance + balanceDelta;

  if (nextBalance < 0) {
    throw new Error(
      `Insufficient credits. User has ${currentBalance} credits but ${params.amount} would be deducted.`
    );
  }

  const reference = `Admin adjustment: ${params.reason?.trim() || 'No note provided'}`;
  const transactions = currentWallet
    ? await getWalletTransactionsFromSupabase(params.targetUserId)
    : [];
  const nextWallet: Wallet = {
    balance: nextBalance,
    lastRequestId: '',
    lastRequestOwnerId: '',
    dailyEarnedDate: currentWallet?.dailyEarnedDate,
    dailyEarnedCredits: currentWallet?.dailyEarnedCredits ?? 0,
    lastWalletAction: params.direction === 'add' ? 'manual_earn' : 'manual_spend',
    createdAt: currentWallet?.createdAt ?? now,
    updatedAt: now,
  };

  await replaceWalletStateInSupabase({
    userId: params.targetUserId,
    wallet: nextWallet,
    transactions: [
      buildAdminCreditTransaction({
        direction: params.direction,
        amount: params.amount,
        reference,
        balanceAfter: nextBalance,
      }),
      ...transactions,
    ],
  });

  return nextBalance;
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
    if (!isModerationPayload(payload) || typeof payload.actorId !== 'string') {
      return NextResponse.json({ error: 'Invalid moderation payload' }, { status: 400 });
    }
    if (payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for moderation action' }, { status: 403 });
    }

    if (payload.action === 'create-report') {
      const report = payload.report;
      if (
        !report ||
        typeof report.id !== 'string' ||
        typeof report.reporterId !== 'string' ||
        typeof report.type !== 'string' ||
        typeof report.reason !== 'string'
      ) {
        return NextResponse.json({ error: 'Invalid moderation report payload' }, { status: 400 });
      }
      if (report.reporterId !== payload.actorId) {
        return NextResponse.json({ error: 'Reporter mismatch for moderation report' }, { status: 403 });
      }

      await upsertReportInSupabase({
        ...report,
        id: report.id,
        reporterId: report.reporterId,
        type: report.type,
        reason: report.reason,
        status: report.status ?? 'open',
      } as SupabaseReportInput);

      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'update-report-status') {
      if (typeof payload.reportId !== 'string' || !payload.reportId.trim()) {
        return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
      }
      if (
        payload.status !== 'open' &&
        payload.status !== 'resolved' &&
        payload.status !== 'dismissed'
      ) {
        return NextResponse.json({ error: 'Invalid report status' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);
      await updateReportStatusInSupabase(payload.reportId.trim(), payload.status);

      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'set-account-frozen') {
      if (typeof payload.targetUserId !== 'string' || !payload.targetUserId.trim()) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }
      if (typeof payload.frozen !== 'boolean') {
        return NextResponse.json({ error: 'frozen is required' }, { status: 400 });
      }
      const reason = payload.reason?.trim();
      if (!reason) {
        return NextResponse.json({ error: 'A reason or internal note is required' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);
      if (payload.frozen) {
        await assertCanFreezeAccount(payload.targetUserId.trim());
      }

      await setAccountFrozenWithAudit({
        adminId: payload.actorId,
        targetUserId: payload.targetUserId.trim(),
        frozen: payload.frozen,
        reason,
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'freeze-account') {
      if (typeof payload.targetUserId !== 'string' || !payload.targetUserId.trim()) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }
      const reason = payload.reason?.trim();
      if (!reason) {
        return NextResponse.json({ error: 'A reason or internal note is required' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);
      await assertCanFreezeAccount(payload.targetUserId.trim());

      await setAccountFrozenWithAudit({
        adminId: payload.actorId,
        targetUserId: payload.targetUserId.trim(),
        frozen: true,
        reason,
      });

      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'delete-review') {
      if (typeof payload.ownerId !== 'string' || typeof payload.requestId !== 'string') {
        return NextResponse.json({ error: 'ownerId and requestId are required' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);

      const requestRecord = await getRequestByIdFromSupabase(payload.ownerId, payload.requestId);
      if (!requestRecord) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      if (!requestRecord.review && !requestRecord.ownerReview) {
        return NextResponse.json({ ok: true });
      }

      await upsertRequestInSupabase({
        ...requestRecord,
        review: undefined,
        ownerReview: undefined,
        updatedAt: new Date(),
      });

      if (requestRecord.sitterId) {
        const [sitterRequests, completedSitsCount, sitterProfile] = await Promise.all([
          getSitterRequestsFromSupabase(requestRecord.sitterId),
          getCompletedSitsCountFromSupabase(requestRecord.sitterId),
          getProfileFromSupabase(requestRecord.sitterId),
        ]);

        const { ratingAverage, ratingCount } = getReviewMetrics(sitterRequests);
        const trustScore = sitterProfile
          ? calculateTrustScore(
              {
                ...sitterProfile,
                ratingAverage,
                ratingCount,
              },
              completedSitsCount
            )
          : 0;

        const supabase = createSupabaseAdminClient();
        const profileUpdates = {
          rating_average: ratingAverage,
          rating_count: ratingCount,
          trust_score: trustScore,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('uid', requestRecord.sitterId);
        if (profileError) {
          return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        const { error: publicProfileError } = await supabase
          .from('public_profiles')
          .update(profileUpdates)
          .eq('uid', requestRecord.sitterId);
        if (publicProfileError) {
          return NextResponse.json({ error: publicProfileError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'adjust-credits') {
      if (typeof payload.targetUserId !== 'string' || !payload.targetUserId.trim()) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }
      if (payload.direction !== 'add' && payload.direction !== 'deduct') {
        return NextResponse.json({ error: 'direction must be add or deduct' }, { status: 400 });
      }
      if (
        typeof payload.amount !== 'number' ||
        !Number.isFinite(payload.amount) ||
        payload.amount <= 0
      ) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);
      const balance = await adjustUserCredits({
        targetUserId: payload.targetUserId.trim(),
        amount: payload.amount,
        direction: payload.direction,
        reason: payload.reason,
      });

      return NextResponse.json({ ok: true, balance });
    }

    return NextResponse.json({ error: 'Unsupported moderation action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected moderation sync failure';
    const status =
      message === 'Admin access required' || message === 'Admin accounts cannot be frozen'
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

