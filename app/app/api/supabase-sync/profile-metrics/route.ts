import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';
import {
  getCompletedSitsCountFromSupabase,
  getRequestByIdOnlyFromSupabase,
  getSitterRequestsFromSupabase,
} from '@/lib/supabaseRequestStore';
import { calculateTrustScore } from '@/lib/trustScore';

type ProfileMetricsPayload = {
  actorId?: string;
  targetUserId?: string;
  relatedRequestId?: string;
  ratingAverage?: number;
  ratingCount?: number;
  trustScore?: number;
  recalculateTrustScore?: boolean;
  frozen?: boolean;
};

function isProfileMetricsPayload(value: unknown): value is ProfileMetricsPayload {
  return Boolean(value && typeof value === 'object');
}

async function canActorUpdateTarget(
  actorId: string,
  targetUserId: string,
  relatedRequestId?: string
): Promise<boolean> {
  if (actorId === targetUserId) {
    return true;
  }

  const actorProfile = await getProfileFromSupabase(actorId);
  if (actorProfile?.role === 'admin') {
    return true;
  }

  if (!relatedRequestId) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('requests')
    .select('owner_uid, sitter_uid, requested_sitter_uid')
    .eq('id', relatedRequestId)
    .maybeSingle<{
      owner_uid: string;
      sitter_uid: string | null;
      requested_sitter_uid: string | null;
    }>();

  if (error || !data) {
    return false;
  }

  const participants = [data.owner_uid, data.sitter_uid, data.requested_sitter_uid].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );

  return participants.includes(actorId) && participants.includes(targetUserId);
}

export async function POST(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const authUser = await verifySessionToken(idToken);
    if (!authUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (
      !isProfileMetricsPayload(payload) ||
      typeof payload.actorId !== 'string' ||
      typeof payload.targetUserId !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid profile metrics payload' }, { status: 400 });
    }

    if (payload.actorId !== authUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for profile metrics sync' }, { status: 403 });
    }

    const allowed = await canActorUpdateTarget(
      payload.actorId,
      payload.targetUserId,
      payload.relatedRequestId
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden profile metrics target' }, { status: 403 });
    }

    const actorProfile = await getProfileFromSupabase(payload.actorId);
    const actorIsAdmin = actorProfile?.role === 'admin';

    if (typeof payload.frozen === 'boolean' && !actorIsAdmin) {
      return NextResponse.json({ error: 'Only admins can change frozen status' }, { status: 403 });
    }

    let verifiedRatingMetrics: { ratingAverage: number; ratingCount: number } | undefined;
    const includesClientMetrics =
      typeof payload.ratingAverage === 'number' ||
      typeof payload.ratingCount === 'number' ||
      typeof payload.trustScore === 'number';

    if (!actorIsAdmin && includesClientMetrics) {
      if (!payload.relatedRequestId) {
        return NextResponse.json({ error: 'Server-owned profile metrics cannot be set directly' }, { status: 403 });
      }

      const relatedRequest = await getRequestByIdOnlyFromSupabase(payload.relatedRequestId);
      if (
        !relatedRequest ||
        relatedRequest.status !== 'completed' ||
        relatedRequest.ownerId !== payload.actorId ||
        relatedRequest.sitterId !== payload.targetUserId
      ) {
        return NextResponse.json({ error: 'Invalid request for profile metrics update' }, { status: 403 });
      }

      const completedRequests = await getSitterRequestsFromSupabase(payload.targetUserId);
      const ratings = completedRequests
        .filter((entry) => entry.status === 'completed')
        .map((entry) => entry.ownerReview ?? entry.review)
        .filter((review): review is NonNullable<typeof review> => Boolean(review))
        .map((review) => review.rating)
        .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
      verifiedRatingMetrics = {
        ratingCount: ratings.length,
        ratingAverage:
          ratings.length > 0
            ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
            : 0,
      };
    }

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const publicProfileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const resolvedRatingAverage = verifiedRatingMetrics?.ratingAverage ?? payload.ratingAverage;
    const resolvedRatingCount = verifiedRatingMetrics?.ratingCount ?? payload.ratingCount;
    if (typeof resolvedRatingAverage === 'number' && Number.isFinite(resolvedRatingAverage)) {
      profileUpdates.rating_average = resolvedRatingAverage;
      publicProfileUpdates.rating_average = resolvedRatingAverage;
    }
    if (typeof resolvedRatingCount === 'number' && Number.isFinite(resolvedRatingCount)) {
      profileUpdates.rating_count = resolvedRatingCount;
      publicProfileUpdates.rating_count = resolvedRatingCount;
    }
    let resolvedTrustScore: number | undefined;
    if (actorIsAdmin && typeof payload.trustScore === 'number' && Number.isFinite(payload.trustScore)) {
      resolvedTrustScore = payload.trustScore;
    } else if (payload.recalculateTrustScore) {
      const targetProfile = await getProfileFromSupabase(payload.targetUserId);
      if (!targetProfile) {
        return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
      }

      const completedSits = await getCompletedSitsCountFromSupabase(payload.targetUserId);
      resolvedTrustScore = calculateTrustScore(
        {
          ...targetProfile,
          ratingAverage: resolvedRatingAverage ?? targetProfile.ratingAverage,
          ratingCount: resolvedRatingCount ?? targetProfile.ratingCount,
        },
        completedSits
      );
    }

    if (typeof resolvedTrustScore === 'number' && Number.isFinite(resolvedTrustScore)) {
      profileUpdates.trust_score = resolvedTrustScore;
      publicProfileUpdates.trust_score = resolvedTrustScore;
    }
    if (typeof payload.frozen === 'boolean') {
      profileUpdates.frozen = payload.frozen;
    }

    const supabase = createSupabaseAdminClient();
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('uid', payload.targetUserId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (Object.keys(publicProfileUpdates).length > 1) {
      const { error: publicProfileError } = await supabase
        .from('public_profiles')
        .update(publicProfileUpdates)
        .eq('uid', payload.targetUserId);

      if (publicProfileError) {
        return NextResponse.json({ error: publicProfileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected profile metrics sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

