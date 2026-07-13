import { REPEATED_PAIR_ACTIVITY_THRESHOLD } from './platformPolicy';
import { AdminActionLogRecord, ReportRecord, ReportStatus } from '@/types/moderation';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { getSupabaseAuthHeaders } from './supabaseAuthClient';

export type AdminUserCreditRecord = {
  uid: string;
  name: string;
  email: string;
  creditAmount: number;
  createdAt: Date;
};

function generateReportId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapReportRecord(data: Record<string, unknown>): ReportRecord {
  return {
    id: (data.id as string) || '',
    reporterId: (data.reporterId as string) || '',
    type: (data.type as ReportRecord['type']) || 'user',
    targetUserId: (data.targetUserId as string) || undefined,
    targetOwnerId: (data.targetOwnerId as string) || undefined,
    targetRequestId: (data.targetRequestId as string) || undefined,
    reason: (data.reason as string) || '',
    status: (data.status as ReportRecord['status']) || 'open',
    createdAt:
      typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
        ? new Date(data.createdAt)
        : new Date(),
  };
}

function mapAdminUserCreditRecord(data: Record<string, unknown>): AdminUserCreditRecord {
  return {
    uid: (data.uid as string) || '',
    name: (data.name as string) || '',
    email: (data.email as string) || '',
    creditAmount: typeof data.creditAmount === 'number' ? data.creditAmount : 0,
    createdAt:
      typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
        ? new Date(data.createdAt)
        : new Date(),
  };
}

function mapAdminActionLogRecord(data: Record<string, unknown>): AdminActionLogRecord {
  return {
    id: (data.id as string) || '',
    adminId: (data.adminId as string) || '',
    targetUserId: (data.targetUserId as string) || '',
    action: (data.action as AdminActionLogRecord['action']) || 'freeze-account',
    reason: (data.reason as string) || '',
    createdAt:
      typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
        ? new Date(data.createdAt)
        : new Date(),
  };
}

async function postModerationAction(actorId: string, payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('/api/supabase-sync/moderation', {
    method: 'POST',
    headers: {
      ...(await getSupabaseAuthHeaders(actorId)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actorId,
      ...payload,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || 'Moderation action failed');
  }
}

export async function reportUser(reporterId: string, targetUserId: string, reason: string): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Reason is required');
  }
  if (reporterId === targetUserId) {
    throw new Error('You cannot report your own account');
  }

  await postModerationAction(reporterId, {
    action: 'create-report',
    report: {
      id: generateReportId(),
      reporterId,
      type: 'user',
      targetUserId,
      reason: trimmedReason,
      status: 'open',
      createdAt: new Date(),
    },
  });
}

export async function reportRequest(
  reporterId: string,
  targetOwnerId: string,
  targetRequestId: string,
  reason: string
): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Reason is required');
  }
  if (!targetOwnerId.trim() || !targetRequestId.trim()) {
    throw new Error('Target request is required');
  }

  await postModerationAction(reporterId, {
    action: 'create-report',
    report: {
      id: generateReportId(),
      reporterId,
      type: 'request',
      targetOwnerId,
      targetRequestId,
      reason: trimmedReason,
      status: 'open',
      createdAt: new Date(),
    },
  });
}

export async function viewReportedUsers(adminId: string): Promise<ReportRecord[]> {
  const payload = await fetchSupabaseReadJson<{ reports: Array<Record<string, unknown>> }>(
    `/api/supabase-read/moderation?scope=reported-users&adminId=${encodeURIComponent(adminId)}`,
    { requireAuth: true }
  );

  return payload.reports.map(mapReportRecord);
}

export async function viewSuspiciousActivity(adminId: string): Promise<ReportRecord[]> {
  const payload = await fetchSupabaseReadJson<{ reports: Array<Record<string, unknown>> }>(
    `/api/supabase-read/moderation?scope=open-reports&adminId=${encodeURIComponent(adminId)}`,
    { requireAuth: true }
  );

  return payload.reports.map(mapReportRecord);
}

export async function viewOpenReports(adminId: string): Promise<ReportRecord[]> {
  return viewSuspiciousActivity(adminId);
}

export async function viewAdminUsers(adminId: string): Promise<AdminUserCreditRecord[]> {
  const payload = await fetchSupabaseReadJson<{ users: Array<Record<string, unknown>> }>(
    `/api/supabase-read/moderation?scope=admin-users&adminId=${encodeURIComponent(adminId)}`,
    { requireAuth: true }
  );

  return payload.users.map(mapAdminUserCreditRecord);
}

export async function viewAdminActionLogs(adminId: string): Promise<AdminActionLogRecord[]> {
  const payload = await fetchSupabaseReadJson<{ actions: Array<Record<string, unknown>> }>(
    `/api/supabase-read/moderation?scope=admin-action-logs&adminId=${encodeURIComponent(adminId)}`,
    { requireAuth: true }
  );

  return payload.actions.map(mapAdminActionLogRecord);
}

export async function logRepeatedPairActivity(
  ownerId: string,
  sitterId: string,
  requestId: string
): Promise<void> {
  const payload = await fetchSupabaseReadJson<{ requests: Array<Record<string, unknown>> }>(
    `/api/supabase-read/request?scope=user-requests&ownerId=${encodeURIComponent(ownerId)}`,
    { requireAuth: true }
  );

  const repeatedCount = payload.requests.filter(
    (request) =>
      (request.ownerId as string) === ownerId &&
      (request.sitterId as string) === sitterId &&
      (request.status as string) === 'completed'
  ).length;

  if (repeatedCount < REPEATED_PAIR_ACTIVITY_THRESHOLD) {
    return;
  }

  await postModerationAction(ownerId, {
    action: 'create-report',
    report: {
      id: generateReportId(),
      reporterId: ownerId,
      type: 'suspicious',
      targetUserId: sitterId,
      targetOwnerId: ownerId,
      targetRequestId: requestId,
      reason: `Repeated completed exchanges detected between the same owner and sitter (${repeatedCount} total).`,
      status: 'open',
      createdAt: new Date(),
    },
  });
}

export async function freezeAccount(adminId: string, targetUserId: string, reason: string): Promise<void> {
  await postModerationAction(adminId, {
    action: 'freeze-account',
    targetUserId,
    reason: reason || 'Admin action',
  });
}

export async function setAccountFrozen(
  adminId: string,
  targetUserId: string,
  frozen: boolean,
  reason: string
): Promise<void> {
  await postModerationAction(adminId, {
    action: 'set-account-frozen',
    targetUserId,
    frozen,
    reason: reason || 'Admin action',
  });
}

export async function updateReportStatus(
  adminId: string,
  reportId: string,
  status: ReportStatus
): Promise<void> {
  await postModerationAction(adminId, {
    action: 'update-report-status',
    reportId,
    status,
  });
}

export async function deleteAbusiveReview(
  adminId: string,
  ownerId: string,
  requestId: string
): Promise<void> {
  await postModerationAction(adminId, {
    action: 'delete-review',
    ownerId,
    requestId,
  });
}

export async function adjustUserCredits(
  adminId: string,
  targetUserId: string,
  amount: number,
  direction: 'add' | 'deduct',
  reason: string
): Promise<void> {
  await postModerationAction(adminId, {
    action: 'adjust-credits',
    targetUserId,
    amount,
    direction,
    reason,
  });
}
