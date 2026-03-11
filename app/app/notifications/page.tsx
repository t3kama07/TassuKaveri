'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getUserNotifications, markNotificationRead } from '@/lib/notificationService';
import { AppNotification } from '@/types/notification';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, [user]);

  async function loadNotifications() {
    if (!user) return;

    try {
      setLoading(true);
      const userNotifications = await getUserNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load notifications: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    await markNotificationRead(notificationId);
    await loadNotifications();
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Notifications</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border p-4 ${
                  notification.read ? 'border-gray-200' : 'border-[#ff7a2d]'
                }`}
              >
                <p className="text-[#0f2640] font-medium">{notification.message}</p>
                <p className="text-xs text-[#6b7280] mt-1">
                  {notification.createdAt.toLocaleDateString()} {notification.createdAt.toLocaleTimeString()}
                </p>
                {!notification.read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
