import { AppNotification, CreateNotificationData } from '@/types/notification';
import { getCurrentAuthUser } from './supabaseAuthClient';
import { mirrorNotificationToSupabase } from './supabaseMirrorClient';
import { fetchSupabaseReadJson } from './supabaseReadClient';

function generateNotificationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapNotification(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    type: data.type as AppNotification['type'],
    relatedRequestId:
      typeof data.relatedRequestId === 'string' ? data.relatedRequestId : undefined,
    message: typeof data.message === 'string' ? data.message : '',
    read: Boolean(data.read),
    createdAt:
      typeof data.createdAt === 'string' || typeof data.createdAt === 'number'
        ? new Date(data.createdAt)
        : new Date(),
  };
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  const currentUser = await getCurrentAuthUser();
  const actorId = currentUser?.uid ?? data.userId;

  await mirrorNotificationToSupabase({
    actorId,
    notification: {
      id: generateNotificationId(),
      userId: data.userId,
      type: data.type,
      relatedRequestId: data.relatedRequestId,
      message: data.message,
      read: false,
      createdAt: new Date(),
    },
  });
}

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const payload = await fetchSupabaseReadJson<{ notifications: Array<Record<string, unknown>> }>(
    `/api/supabase-read/notification?userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return payload.notifications.map((notification) =>
    mapNotification((notification.id as string) || '', notification)
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const currentUser = await getCurrentAuthUser();
  if (!currentUser) {
    throw new Error('Missing authenticated user');
  }

  const notifications = await getUserNotifications(currentUser.uid);
  const notification = notifications.find((entry) => entry.id === notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  await mirrorNotificationToSupabase({
    actorId: currentUser.uid,
    notification: {
      ...notification,
      read: true,
    },
  });
}

async function getUnreadNotificationCount(userId: string): Promise<number> {
  const payload = await fetchSupabaseReadJson<{ unreadCount: number }>(
    `/api/supabase-read/notification?scope=unread-count&userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;
}

export function subscribeUnreadNotificationCount(
  userId: string,
  onCount: (count: number) => void
) {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  async function refreshCount() {
    try {
      const unreadCount = await getUnreadNotificationCount(userId);
      if (!cancelled) {
        onCount(unreadCount);
      }
    } catch (error) {
      if (!cancelled) {
        console.warn('Failed to refresh unread notification count from Supabase', error);
      }
    } finally {
      if (!cancelled) {
        timeoutId = setTimeout(refreshCount, 15000);
      }
    }
  }

  timeoutId = setTimeout(refreshCount, 1500);

  return () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
