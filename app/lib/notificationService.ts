import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, CreateNotificationData } from '@/types/notification';

function getNotificationsRef() {
  return collection(db, 'notifications');
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  await addDoc(getNotificationsRef(), {
    userId: data.userId,
    type: data.type,
    relatedRequestId: data.relatedRequestId || null,
    message: data.message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    getNotificationsRef(),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const notifications: AppNotification[] = [];

  snapshot.forEach((notificationDoc) => {
    const data = notificationDoc.data();
    notifications.push({
      id: notificationDoc.id,
      userId: data.userId,
      type: data.type,
      relatedRequestId: data.relatedRequestId || undefined,
      message: data.message,
      read: Boolean(data.read),
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  });

  return notifications;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, { read: true });
}

export function subscribeUnreadNotificationCount(
  userId: string,
  onCount: (count: number) => void
) {
  const q = query(getNotificationsRef(), where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    let unreadCount = 0;

    snapshot.forEach((notificationDoc) => {
      if (notificationDoc.data().read !== true) {
        unreadCount += 1;
      }
    });

    onCount(unreadCount);
  });
}
