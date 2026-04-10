import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getUnreadNotificationCountFromSupabase,
  getUserNotificationsFromSupabase,
} from '@/lib/supabaseNotificationStore';

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
      return NextResponse.json({ error: 'Forbidden notification read target' }, { status: 403 });
    }

    const scope = request.nextUrl.searchParams.get('scope');
    if (scope === 'unread-count') {
      const unreadCount = await getUnreadNotificationCountFromSupabase(userId);
      return NextResponse.json({ unreadCount });
    }

    const notifications = await getUserNotificationsFromSupabase(userId);
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected notification read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

