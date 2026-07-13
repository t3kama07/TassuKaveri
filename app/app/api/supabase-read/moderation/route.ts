import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getAdminActionLogsFromSupabase,
  getReportsFromSupabase,
} from '@/lib/supabaseModerationStore';
import {
  getAdminUserCreditsFromSupabase,
  getProfileFromSupabase,
} from '@/lib/supabaseProfileStore';

async function assertAdmin(adminId: string) {
  const profile = await getProfileFromSupabase(adminId);
  if (!profile || profile.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request.headers);
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(accessToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const adminId = request.nextUrl.searchParams.get('adminId') || sessionUser.uid;
    if (adminId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Admin mismatch for moderation read' }, { status: 403 });
    }

    await assertAdmin(adminId);

    const scope = request.nextUrl.searchParams.get('scope');
    if (scope === 'reported-users') {
      const reports = await getReportsFromSupabase({
        type: 'user',
        status: 'open',
      });
      return NextResponse.json({ reports });
    }

    if (scope === 'open-reports') {
      const reports = await getReportsFromSupabase({
        status: 'open',
      });
      return NextResponse.json({ reports });
    }

    if (scope === 'admin-users') {
      const users = await getAdminUserCreditsFromSupabase();
      return NextResponse.json({ users });
    }

    if (scope === 'admin-action-logs') {
      const actions = await getAdminActionLogsFromSupabase();
      return NextResponse.json({ actions });
    }

    return NextResponse.json({ error: 'Invalid moderation read scope' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected moderation read failure';
    const status = message === 'Admin access required' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

