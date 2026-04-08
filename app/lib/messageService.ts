import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, Message } from '@/types/message';
import { getProfile } from './profileService';
import { createNotification } from './notificationService';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date();
}

export function buildConversationId(requestId: string, ownerId: string, sitterId: string): string {
  return `${requestId}_${ownerId}_${sitterId}`;
}

function getConversationRef(ownerId: string, requestId: string, sitterId: string) {
  const conversationId = buildConversationId(requestId, ownerId, sitterId);
  return doc(db, 'users', ownerId, 'requests', requestId, 'conversations', conversationId);
}

function getConversationMessagesRef(ownerId: string, requestId: string, sitterId: string) {
  const conversationId = buildConversationId(requestId, ownerId, sitterId);
  return collection(
    db,
    'users',
    ownerId,
    'requests',
    requestId,
    'conversations',
    conversationId,
    'messages'
  );
}

function mapMessage(
  ownerId: string,
  requestId: string,
  sitterId: string,
  id: string,
  data: Record<string, unknown>
): Message {
  return {
    id,
    conversationId: buildConversationId(requestId, ownerId, sitterId),
    ownerId,
    requestId,
    sitterId,
    senderId: (data.senderId as string) || '',
    senderName: (data.senderName as string) || 'User',
    recipientId: (data.recipientId as string) || '',
    text: (data.text as string) || '',
    read: Boolean(data.read),
    createdAt: toDate(data.createdAt),
  };
}

function mapConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    conversationId: id,
    ownerId: (data.ownerId as string) || '',
    requestId: (data.requestId as string) || '',
    sitterId: (data.sitterId as string) || '',
    title: (data.title as string) || 'Conversation',
    subtitle: (data.subtitle as string) || '',
    otherUserId: '',
    otherUserName: '',
    status: (data.status as string) || 'open',
  };
}

/**
 * Create pre-acceptance conversation when sitter applies.
 */
export async function ensureConversation(
  ownerId: string,
  requestId: string,
  sitterId: string,
  sitterName?: string
): Promise<void> {
  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const requestData = requestSnap.data();
  const conversationRef = getConversationRef(ownerId, requestId, sitterId);
  const conversationSnap = await getDoc(conversationRef);
  if (conversationSnap.exists()) {
    return;
  }

  await setDoc(conversationRef, {
    ownerId,
    requestId,
    sitterId,
    sitterName: sitterName || requestData.sitterName || 'Sitter',
    ownerName: requestData.ownerName || 'Owner',
    title: Array.isArray(requestData.petNames) ? requestData.petNames.join(', ') : 'Pet request',
    subtitle: requestData.location || '',
    status: requestData.status || 'open',
    participants: [ownerId, sitterId],
    lastMessage: '',
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const conversationsWithTime: Array<{ conversation: Conversation; updatedAtTime: number }> = [];
  const conversationsQuery = query(
    collectionGroup(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );
  const conversationsSnapshot = await getDocs(conversationsQuery);

  conversationsSnapshot.forEach((conversationDoc) => {
    const data = conversationDoc.data();
    const base = mapConversation(conversationDoc.id, data);
    const ownerId = base.ownerId;
    const sitterId = base.sitterId;
    const isOwner = userId === ownerId;

    const updatedAt =
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().getTime() : 0;

    conversationsWithTime.push({
      conversation: {
        ...base,
        otherUserId: isOwner ? sitterId : ownerId,
        otherUserName: isOwner
          ? (data.sitterName as string) || 'Sitter'
          : (data.ownerName as string) || 'Owner',
      },
      updatedAtTime: updatedAt,
    });
  });

  conversationsWithTime.sort((a, b) => {
    return b.updatedAtTime - a.updatedAtTime;
  });

  return conversationsWithTime.map((item) => item.conversation);
}

/**
 * Send message in request conversation (works pre-accept and post-accept).
 */
export async function sendMessage(
  ownerId: string,
  requestId: string,
  sitterId: string,
  senderId: string,
  text: string
): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Message cannot be empty');
  }

  const requestRef = doc(db, 'users', ownerId, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  if (senderId !== ownerId && senderId !== sitterId) {
    throw new Error('You are not part of this conversation');
  }

  const recipientId = senderId === ownerId ? sitterId : ownerId;
  const senderProfile = await getProfile(senderId);
  const senderName = senderProfile?.name || 'User';
  const conversationRef = getConversationRef(ownerId, requestId, sitterId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    await ensureConversation(ownerId, requestId, sitterId);
  }

  await addDoc(getConversationMessagesRef(ownerId, requestId, sitterId), {
    conversationId: buildConversationId(requestId, ownerId, sitterId),
    ownerId,
    requestId,
    sitterId,
    senderId,
    senderName,
    recipientId,
    text: trimmedText,
    read: false,
    createdAt: serverTimestamp(),
  });

  await updateDoc(conversationRef, {
    lastMessage: trimmedText,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: recipientId,
    type: 'message_received',
    relatedRequestId: requestId,
    message: `New message from ${senderName}`,
  });
}

export function subscribeToMessages(
  ownerId: string,
  requestId: string,
  sitterId: string,
  onData: (messages: Message[]) => void
) {
  const q = query(getConversationMessagesRef(ownerId, requestId, sitterId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((messageDoc) =>
      mapMessage(ownerId, requestId, sitterId, messageDoc.id, messageDoc.data())
    );
    onData(messages);
  });
}

export async function markMessagesAsRead(
  ownerId: string,
  requestId: string,
  sitterId: string,
  userId: string
): Promise<void> {
  const unreadQuery = query(
    getConversationMessagesRef(ownerId, requestId, sitterId),
    where('recipientId', '==', userId),
    where('read', '==', false)
  );

  const unreadSnapshot = await getDocs(unreadQuery);
  if (unreadSnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  unreadSnapshot.forEach((messageDoc) => {
    batch.update(messageDoc.ref, { read: true });
  });
  await batch.commit();
}

export function subscribeUnreadCount(userId: string, onCount: (count: number) => void) {
  const q = query(
    collectionGroup(db, 'messages'),
    where('recipientId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const unreadCount = snapshot.docs.reduce((count, messageDoc) => {
      return messageDoc.data().read === false ? count + 1 : count;
    }, 0);

    onCount(unreadCount);
  });
}

export async function getLatestMessage(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<Message | null> {
  const q = query(
    getConversationMessagesRef(ownerId, requestId, sitterId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const latestDoc = snapshot.docs[0];
  return mapMessage(ownerId, requestId, sitterId, latestDoc.id, latestDoc.data());
}
