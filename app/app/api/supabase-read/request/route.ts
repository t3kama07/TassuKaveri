import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getRequestByIdFromSupabase,
  getCompletedSitsCountFromSupabase,
  getDirectRequestsForSitterFromSupabase,
  getOpenCommunityRequestsFromSupabase,
  getSitterCancellationStatsFromSupabase,
  getSitterRequestsFromSupabase,
  getSitterReviewsFromSupabase,
  getUserRequestsFromSupabase,
  hasActiveRequestConflictFromSupabase,
} from '@/lib/supabaseRequestStore';

const DEFAULT_OPEN_REQUEST_LIMIT = 50;
const MAX_OPEN_REQUEST_LIMIT = 100;

function parseBoundedLimit(value: string | null): number {
  const parsed = value ? Number(value) : DEFAULT_OPEN_REQUEST_LIMIT;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OPEN_REQUEST_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_OPEN_REQUEST_LIMIT);
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

    const scope = request.nextUrl.searchParams.get('scope');

    if (scope === 'request') {
      const ownerId = request.nextUrl.searchParams.get('ownerId');
      const requestId = request.nextUrl.searchParams.get('requestId');
      if (!ownerId || !requestId) {
        return NextResponse.json(
          { error: 'ownerId and requestId are required' },
          { status: 400 }
        );
      }

      const requestRecord = await getRequestByIdFromSupabase(ownerId, requestId);
      if (!requestRecord) {
        return NextResponse.json({ request: null });
      }

      const isFundedOpenRequest =
        requestRecord.status === 'open' && requestRecord.escrowStatus === 'held';
      const isRequestedSitter =
        isFundedOpenRequest && sessionUser.uid === requestRecord.requestedSitterId;
      const isApplicant =
        isFundedOpenRequest &&
        (requestRecord.applications ?? []).some(
          (application) => application.sitterId === sessionUser.uid
        );
      const isParticipant =
        sessionUser.uid === ownerId ||
        sessionUser.uid === requestRecord.sitterId ||
        isRequestedSitter ||
        isApplicant;

      const isEligibleOpenRequestViewer =
        isFundedOpenRequest &&
        (requestRecord.audience === 'community' ||
          requestRecord.requestedSitterId === sessionUser.uid);

      if (!isParticipant && !isEligibleOpenRequestViewer) {
        return NextResponse.json(
          { error: 'Forbidden request read target' },
          { status: 403 }
        );
      }

      return NextResponse.json({ request: requestRecord });
    }

    if (scope === 'user-requests') {
      const ownerId = request.nextUrl.searchParams.get('ownerId');
      if (!ownerId) {
        return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
      }
      if (ownerId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden request read target' }, { status: 403 });
      }

      const requests = await getUserRequestsFromSupabase(ownerId);
      return NextResponse.json({ requests });
    }

    if (scope === 'all-open') {
      const excludeUserId = request.nextUrl.searchParams.get('excludeUserId') || undefined;
      if (excludeUserId && excludeUserId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden open requests filter' }, { status: 403 });
      }

      const limit = parseBoundedLimit(request.nextUrl.searchParams.get('limit'));
      const requests = await getOpenCommunityRequestsFromSupabase(excludeUserId, { limit });
      return NextResponse.json({ requests });
    }

    if (scope === 'direct-for-sitter') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      if (!sitterId) {
        return NextResponse.json({ error: 'sitterId is required' }, { status: 400 });
      }
      if (sitterId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden direct request read target' }, { status: 403 });
      }

      const requests = await getDirectRequestsForSitterFromSupabase(sitterId);
      return NextResponse.json({ requests });
    }

    if (scope === 'sitter-requests') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      if (!sitterId) {
        return NextResponse.json({ error: 'sitterId is required' }, { status: 400 });
      }
      if (sitterId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden sitter request read target' }, { status: 403 });
      }

      const requests = await getSitterRequestsFromSupabase(sitterId);
      return NextResponse.json({ requests });
    }

    if (scope === 'completed-count') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      if (!sitterId) {
        return NextResponse.json({ error: 'sitterId is required' }, { status: 400 });
      }

      const completedCount = await getCompletedSitsCountFromSupabase(sitterId);
      return NextResponse.json({ completedCount });
    }

    if (scope === 'sitter-cancellation-stats') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      if (!sitterId) {
        return NextResponse.json({ error: 'sitterId is required' }, { status: 400 });
      }

      const stats = await getSitterCancellationStatsFromSupabase(sitterId);
      return NextResponse.json(stats);
    }

    if (scope === 'sitter-reviews') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      if (!sitterId) {
        return NextResponse.json({ error: 'sitterId is required' }, { status: 400 });
      }

      const reviews = await getSitterReviewsFromSupabase(sitterId);
      return NextResponse.json({ reviews });
    }

    if (scope === 'conflict-check') {
      const sitterId = request.nextUrl.searchParams.get('sitterId');
      const startAt = request.nextUrl.searchParams.get('startAt');
      const endAt = request.nextUrl.searchParams.get('endAt');

      if (!sitterId || !startAt || !endAt) {
        return NextResponse.json(
          { error: 'sitterId, startAt, and endAt are required' },
          { status: 400 }
        );
      }

      const hasConflict = await hasActiveRequestConflictFromSupabase(
        sitterId,
        startAt,
        endAt
      );
      return NextResponse.json({ hasConflict });
    }

    return NextResponse.json({ error: 'Invalid request read scope' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected request read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

