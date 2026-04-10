import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { calculateTrustScore } from '@/lib/trustScore';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { upsertReportInSupabase, type SupabaseReportInput } from '@/lib/supabaseModerationStore';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';
import {
  getCompletedSitsCountFromSupabase,
  getRequestByIdFromSupabase,
  getSitterRequestsFromSupabase,
  upsertRequestInSupabase,
} from '@/lib/supabaseRequestStore';

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
      action: 'delete-review';
      actorId?: string;
      ownerId?: string;
      requestId?: string;
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

    if (payload.action === 'freeze-account') {
      if (typeof payload.targetUserId !== 'string' || !payload.targetUserId.trim()) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }

      await assertAdmin(payload.actorId);

      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          frozen: true,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', payload.targetUserId.trim());

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

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

    return NextResponse.json({ error: 'Unsupported moderation action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected moderation sync failure';
    const status = message === 'Admin access required' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

