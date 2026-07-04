import { AppNotification } from '@/types/notification';
import { createSupabaseAdminClient } from './supabaseAdmin';

type DateInput = Date | string | number | null | undefined;
type SupabaseNotificationRow = {
  id: string;
  user_uid: string;
  notification_type: AppNotification['type'];
  related_request_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type SupabaseNotificationInput = Omit<AppNotification, 'createdAt'> & {
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

function mapNotificationToSupabaseRow(
  notification: SupabaseNotificationInput
): Record<string, unknown> {
  return {
    id: notification.id,
    user_uid: notification.userId,
    notification_type: asString(notification.type),
    related_request_id: notification.relatedRequestId ? asString(notification.relatedRequestId) : null,
    message: asString(notification.message),
    is_read: Boolean(notification.read),
    created_at: toIsoString(notification.createdAt, new Date()),
  };
}

function mapSupabaseNotificationRow(row: SupabaseNotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_uid,
    type: row.notification_type,
    relatedRequestId: row.related_request_id || undefined,
    message: row.message || '',
    read: Boolean(row.is_read),
    createdAt: toDate(row.created_at),
  };
}

export async function upsertNotificationInSupabase(
  notification: SupabaseNotificationInput
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('notifications')
    .upsert(mapNotificationToSupabaseRow(notification), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert notification in Supabase: ${error.message}`);
  }
}

export async function getUserNotificationsFromSupabase(
  userId: string
): Promise<AppNotification[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_uid', userId)
    .order('created_at', { ascending: false })
    .returns<SupabaseNotificationRow[]>();

  if (error) {
    throw new Error(`Failed to read notifications from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseNotificationRow);
}

export async function getUnreadNotificationCountFromSupabase(userId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_uid', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(`Failed to count unread notifications in Supabase: ${error.message}`);
  }

  return count ?? 0;
}

export async function deleteNotificationsForRequestFromSupabase(requestId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('related_request_id', requestId);

  if (error) {
    throw new Error(`Failed to delete request notifications from Supabase: ${error.message}`);
  }
}
