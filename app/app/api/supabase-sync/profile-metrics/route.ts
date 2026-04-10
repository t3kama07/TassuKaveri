import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getProfileFromSupabase } from '@/lib/supabaseProfileStore';
import { getCompletedSitsCountFromSupabase } from '@/lib/supabaseRequestStore';
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

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const publicProfileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof payload.ratingAverage === 'number' && Number.isFinite(payload.ratingAverage)) {
      profileUpdates.rating_average = payload.ratingAverage;
      publicProfileUpdates.rating_average = payload.ratingAverage;
    }
    if (typeof payload.ratingCount === 'number' && Number.isFinite(payload.ratingCount)) {
      profileUpdates.rating_count = payload.ratingCount;
      publicProfileUpdates.rating_count = payload.ratingCount;
    }
    let resolvedTrustScore: number | undefined;
    if (typeof payload.trustScore === 'number' && Number.isFinite(payload.trustScore)) {
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
          ratingAverage:
            typeof payload.ratingAverage === 'number' && Number.isFinite(payload.ratingAverage)
              ? payload.ratingAverage
              : targetProfile.ratingAverage,
          ratingCount:
            typeof payload.ratingCount === 'number' && Number.isFinite(payload.ratingCount)
              ? payload.ratingCount
              : targetProfile.ratingCount,
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

