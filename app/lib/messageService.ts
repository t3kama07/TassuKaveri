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
  try {
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
      return;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!message.includes('Missing or insufficient permissions')) {
      throw error;
    }
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
  const conversationsById = new Map<
    string,
    { conversation: Conversation; updatedAtTime: number }
  >();

  async function collectConversation(ownerId: string, requestId: string, sitterId: string) {
    if (!sitterId) {
      return;
    }

    let conversationSnap;
    try {
      conversationSnap = await getDoc(getConversationRef(ownerId, requestId, sitterId));
      if (!conversationSnap.exists()) {
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Missing or insufficient permissions')) {
        return;
      }
      throw error;
    }

    const data = conversationSnap.data();
    const base = mapConversation(conversationSnap.id, data);
    const isOwner = userId === ownerId;
    const updatedAt =
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().getTime() : 0;

    conversationsById.set(conversationSnap.id, {
      conversation: {
        ...base,
        otherUserId: isOwner ? sitterId : ownerId,
        otherUserName: isOwner
          ? (data.sitterName as string) || 'Sitter'
          : (data.ownerName as string) || 'Owner',
      },
      updatedAtTime: updatedAt,
    });
  }

  const ownerRequestsSnapshot = await getDocs(collection(db, 'users', userId, 'requests'));
  await Promise.all(
    ownerRequestsSnapshot.docs.map(async (requestDoc) => {
      const sitterId = (requestDoc.data().sitterId as string) || '';
      await collectConversation(userId, requestDoc.id, sitterId);
    })
  );

  const sitterRequestsSnapshot = await getDocs(
    query(collectionGroup(db, 'requests'), where('sitterId', '==', userId))
  );

  await Promise.all(
    sitterRequestsSnapshot.docs.map(async (requestDoc) => {
      const ownerId = requestDoc.ref.parent.parent?.id;
      if (!ownerId || ownerId === userId) {
        return;
      }

      await collectConversation(ownerId, requestDoc.id, userId);
    })
  );

  return [...conversationsById.values()]
    .sort((left, right) => right.updatedAtTime - left.updatedAtTime)
    .map((item) => item.conversation);
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
  try {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('Missing or insufficient permissions')) {
      return null;
    }
    throw error;
  }
}
