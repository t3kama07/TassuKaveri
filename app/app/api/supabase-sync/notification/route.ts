import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { upsertNotificationInSupabase } from '@/lib/supabaseNotificationStore';

type NotificationSyncPayload = {
  actorId?: string;
  notification?: {
    id?: string;
    userId?: string;
    type?: string;
    relatedRequestId?: string;
    message?: string;
    read?: boolean;
    createdAt?: string;
  };
};

function isNotificationSyncPayload(value: unknown): value is NotificationSyncPayload {
  return Boolean(value && typeof value === 'object');
}

async function canActorTargetNotificationForRequest(
  actorId: string,
  targetUserId: string,
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

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (
      !isNotificationSyncPayload(payload) ||
      typeof payload.actorId !== 'string' ||
      !payload.notification ||
      typeof payload.notification.id !== 'string' ||
      typeof payload.notification.userId !== 'string' ||
      typeof payload.notification.type !== 'string' ||
      typeof payload.notification.message !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid notification sync payload' }, { status: 400 });
    }

    if (payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for notification sync' }, { status: 403 });
    }

    const targetUserId = payload.notification.userId;
    const relatedRequestId =
      typeof payload.notification.relatedRequestId === 'string'
        ? payload.notification.relatedRequestId
        : undefined;

    if (targetUserId !== payload.actorId) {
      if (!relatedRequestId) {
        return NextResponse.json(
          { error: 'relatedRequestId is required when syncing another user notification' },
          { status: 403 }
        );
      }

      const allowed = await canActorTargetNotificationForRequest(
        payload.actorId,
        targetUserId,
        relatedRequestId
      );

      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden notification sync target' }, { status: 403 });
      }
    }

    await upsertNotificationInSupabase({
      id: payload.notification.id,
      userId: targetUserId,
      type: payload.notification.type as never,
      relatedRequestId,
      message: payload.notification.message,
      read: payload.notification.read === true,
      createdAt: payload.notification.createdAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected notification sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

