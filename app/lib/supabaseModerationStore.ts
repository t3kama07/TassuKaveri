import {
  AdminActionLogRecord,
  ReportRecord,
  ReportStatus,
  ReportType,
} from '@/types/moderation';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;
type SupabaseReportRow = {
  id: string;
  reporter_uid: string;
  report_type: ReportType;
  target_user_uid: string | null;
  target_owner_uid: string | null;
  target_request_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
};

type SupabaseAdminActionLogRow = {
  id: string;
  admin_uid: string;
  target_user_uid: string;
  action: AdminActionLogRecord['action'];
  reason: string;
  created_at: string;
};

export type SupabaseReportInput = Omit<ReportRecord, 'createdAt'> & {
  createdAt?: DateInput;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toIsoString(value: DateInput, fallback: Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

function toDate(value: DateInput, fallback = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return fallback;
}

function mapReportToSupabaseRow(report: SupabaseReportInput): Record<string, unknown> {
  return {
    id: report.id,
    reporter_uid: report.reporterId,
    report_type: report.type,
    target_user_uid: report.targetUserId ?? null,
    target_owner_uid: report.targetOwnerId ?? null,
    target_request_id: report.targetRequestId ?? null,
    reason: asString(report.reason),
    status: report.status,
    created_at: toIsoString(report.createdAt, new Date()),
  };
}

function mapSupabaseRowToReport(row: SupabaseReportRow): ReportRecord {
  return {
    id: row.id,
    reporterId: row.reporter_uid,
    type: row.report_type,
    targetUserId: row.target_user_uid || undefined,
    targetOwnerId: row.target_owner_uid || undefined,
    targetRequestId: row.target_request_id || undefined,
    reason: row.reason || '',
    status: row.status,
    createdAt: toDate(row.created_at),
  };
}

export async function upsertReportInSupabase(report: SupabaseReportInput): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('reports')
    .upsert(mapReportToSupabaseRow(report), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert moderation report in Supabase: ${error.message}`);
  }
}

export async function updateReportStatusInSupabase(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId);

  if (error) {
    throw new Error(`Failed to update moderation report in Supabase: ${error.message}`);
  }
}

export async function getReportsFromSupabase(filters: {
  type?: ReportType;
  status?: ReportStatus;
}): Promise<ReportRecord[]> {
  const supabase = createSupabaseAdminClient();
  let queryBuilder = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.type) {
    queryBuilder = queryBuilder.eq('report_type', filters.type);
  }
  if (filters.status) {
    queryBuilder = queryBuilder.eq('status', filters.status);
  }

  const { data, error } = await queryBuilder.returns<SupabaseReportRow[]>();
  if (error) {
    throw new Error(`Failed to read moderation reports from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseRowToReport);
}

export async function getAdminActionLogsFromSupabase(
  limit = 50
): Promise<AdminActionLogRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('admin_action_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<SupabaseAdminActionLogRow[]>();

  if (error) {
    throw new Error(`Failed to read admin action logs from Supabase: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    adminId: row.admin_uid,
    targetUserId: row.target_user_uid,
    action: row.action,
    reason: row.reason,
    createdAt: toDate(row.created_at),
  }));
}
