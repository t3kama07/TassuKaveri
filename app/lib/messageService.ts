import { Conversation, Message } from '@/types/message';
import { createNotification } from './notificationService';
import { fetchSupabaseReadJson } from './supabaseReadClient';
import { supabase } from './supabase';
import { getCurrentAuthUser } from './supabaseAuthClient';
import {
  markMessagesReadInSupabase,
  mirrorConversationToSupabase,
  mirrorMessageToSupabase,
} from './supabaseMirrorClient';
import type { SupabaseConversationInput } from './supabaseMessageStore';

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date();
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildConversationId(requestId: string, ownerId: string, sitterId: string): string {
  return `${requestId}_${ownerId}_${sitterId}`;
}

function mapSupabaseMessageRecord(
  message: Record<string, unknown>,
  conversationId: string,
  ownerId: string,
  requestId: string,
  sitterId: string
): Message {
  return {
    id: (message.id as string) || '',
    conversationId: (message.conversationId as string) || conversationId,
    ownerId: (message.ownerId as string) || ownerId,
    requestId: (message.requestId as string) || requestId,
    sitterId: (message.sitterId as string) || sitterId,
    senderId: (message.senderId as string) || '',
    senderName: (message.senderName as string) || 'User',
    recipientId: (message.recipientId as string) || '',
    text: (message.text as string) || '',
    read: Boolean(message.read),
    createdAt: toDate(message.createdAt),
  };
}

async function fetchConversationMessagesFromSupabase(
  conversationId: string,
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<Message[]> {
  const payload = await fetchSupabaseReadJson<{ messages: Array<Record<string, unknown>> }>(
    `/api/supabase-read/message?scope=messages&conversationId=${encodeURIComponent(conversationId)}`,
    { requireAuth: true }
  );

  return payload.messages.map((message) =>
    mapSupabaseMessageRecord(message, conversationId, ownerId, requestId, sitterId)
  );
}

async function fetchUnreadCountFromSupabase(userId: string): Promise<number> {
  const payload = await fetchSupabaseReadJson<{ unreadCount: number }>(
    `/api/supabase-read/message?scope=unread-count&userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;
}

function buildConversationTitle(requestData: Record<string, unknown>): string {
  const petNames = asStringArray(requestData.petNames);
  return petNames.length > 0 ? petNames.join(', ') : 'Pet request';
}

async function getRequestDataForConversation(
  ownerId: string,
  requestId: string
): Promise<Record<string, unknown>> {
  const payload = await fetchSupabaseReadJson<{ request: Record<string, unknown> | null }>(
    `/api/supabase-read/request?scope=request&ownerId=${encodeURIComponent(ownerId)}&requestId=${encodeURIComponent(requestId)}`,
    { requireAuth: true }
  );

  if (!payload.request) {
    throw new Error('Request not found');
  }

  return payload.request;
}

function getApplicantSitterName(
  requestData: Record<string, unknown>,
  sitterId: string
): string | undefined {
  if (!Array.isArray(requestData.applications)) {
    return undefined;
  }

  const matchingApplication = requestData.applications.find((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return asString((item as Record<string, unknown>).sitterId) === sitterId;
  });

  if (!matchingApplication || typeof matchingApplication !== 'object') {
    return undefined;
  }

  const sitterName = asString((matchingApplication as Record<string, unknown>).sitterName);
  return sitterName || undefined;
}

function resolveOwnerName(requestData: Record<string, unknown>): string {
  return asString(requestData.ownerName, 'Owner');
}

function resolveSitterName(
  requestData: Record<string, unknown>,
  sitterId: string,
  fallbackName?: string
): string {
  const assignedSitterName = asString(requestData.sitterName);
  if (assignedSitterName) {
    return assignedSitterName;
  }

  const requestedSitterId = asString(requestData.requestedSitterId);
  const requestedSitterName = asString(requestData.requestedSitterName);
  if (requestedSitterId === sitterId && requestedSitterName) {
    return requestedSitterName;
  }

  const applicantSitterName = getApplicantSitterName(requestData, sitterId);
  if (applicantSitterName) {
    return applicantSitterName;
  }

  return fallbackName || 'Sitter';
}

function buildConversationMirrorInput(params: {
  ownerId: string;
  requestId: string;
  sitterId: string;
  requestData: Record<string, unknown>;
  conversationData?: Record<string, unknown>;
  sitterName?: string;
  lastMessage?: string;
  lastMessageAt?: Date | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}): SupabaseConversationInput {
  const now = new Date();
  const createdAt =
    toOptionalDate(params.createdAt ?? params.conversationData?.createdAt) ?? now;
  const updatedAt =
    toOptionalDate(params.updatedAt ?? params.conversationData?.updatedAt) ?? now;
  const nextLastMessageAt =
    params.lastMessageAt === null
      ? null
      : toOptionalDate(params.lastMessageAt ?? params.conversationData?.lastMessageAt) ?? null;

  return {
    conversationId: buildConversationId(params.requestId, params.ownerId, params.sitterId),
    ownerId: params.ownerId,
    requestId: params.requestId,
    sitterId: params.sitterId,
    ownerName: asString(
      params.conversationData?.ownerName ?? params.requestData.ownerName,
      'Owner'
    ),
    sitterName: asString(
      params.sitterName ?? params.conversationData?.sitterName ?? params.requestData.sitterName,
      'Sitter'
    ),
    title: asString(params.conversationData?.title, buildConversationTitle(params.requestData)),
    subtitle: asString(
      params.conversationData?.subtitle ?? params.requestData.location
    ),
    status: asString(params.conversationData?.status ?? params.requestData.status, 'open'),
    participants: asStringArray(params.conversationData?.participants, [
      params.ownerId,
      params.sitterId,
    ]),
    lastMessage: asString(params.lastMessage ?? params.conversationData?.lastMessage),
    lastMessageAt: nextLastMessageAt,
    createdAt,
    updatedAt,
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
  const requestData = await getRequestDataForConversation(ownerId, requestId);
  const actorId = (await getCurrentAuthUser())?.uid ?? null;
  if (!actorId) {
    throw new Error('Missing authenticated user for conversation sync');
  }
  if (actorId !== ownerId && actorId !== sitterId) {
    throw new Error('You are not part of this conversation');
  }

  const createdAt = toOptionalDate(requestData.createdAt) ?? new Date();
  await mirrorConversationToSupabase({
    actorId,
    conversation: buildConversationMirrorInput({
      ownerId,
      requestId,
      sitterId,
      requestData,
      sitterName,
      lastMessage: '',
      lastMessageAt: null,
      createdAt,
      updatedAt: createdAt,
    }),
  });
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const payload = await fetchSupabaseReadJson<{ conversations: Array<Record<string, unknown>> }>(
    `/api/supabase-read/message?scope=conversations&userId=${encodeURIComponent(userId)}`,
    { requireAuth: true }
  );

  return payload.conversations.map((conversation) => ({
    conversationId: (conversation.conversationId as string) || '',
    ownerId: (conversation.ownerId as string) || '',
    requestId: (conversation.requestId as string) || '',
    sitterId: (conversation.sitterId as string) || '',
    ownerName: (conversation.ownerName as string) || 'Owner',
    sitterName: (conversation.sitterName as string) || 'Sitter',
    title: (conversation.title as string) || 'Conversation',
    subtitle: (conversation.subtitle as string) || '',
    otherUserId: (conversation.otherUserId as string) || '',
    otherUserName: (conversation.otherUserName as string) || '',
    status: (conversation.status as string) || 'open',
  }));
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

  const requestData = await getRequestDataForConversation(ownerId, requestId);

  if (senderId !== ownerId && senderId !== sitterId) {
    throw new Error('You are not part of this conversation');
  }

  const recipientId = senderId === ownerId ? sitterId : ownerId;
  const sentAt = new Date();
  const ownerName = resolveOwnerName(requestData);
  const sitterName = resolveSitterName(requestData, sitterId);
  const senderName = senderId === ownerId ? ownerName : sitterName;
  const messageId = generateMessageId();
  const conversationCreatedAt = toOptionalDate(requestData.createdAt) ?? sentAt;

  await mirrorMessageToSupabase({
    actorId: senderId,
    conversation: buildConversationMirrorInput({
      ownerId,
      requestId,
      sitterId,
      requestData: {
        ...requestData,
        ownerName,
        sitterName,
      },
      sitterName,
      lastMessage: trimmedText,
      lastMessageAt: sentAt,
      createdAt: conversationCreatedAt,
      updatedAt: sentAt,
    }),
    message: {
      id: messageId,
      conversationId: buildConversationId(requestId, ownerId, sitterId),
      ownerId,
      requestId,
      sitterId,
      senderId,
      senderName,
      recipientId,
      text: trimmedText,
      read: false,
      createdAt: sentAt,
      updatedAt: sentAt,
    },
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
  const conversationId = buildConversationId(requestId, ownerId, sitterId);
  let cancelled = false;

  async function refreshMessages() {
    try {
      if (!cancelled) {
        onData(
          await fetchConversationMessagesFromSupabase(
            conversationId,
            ownerId,
            requestId,
            sitterId
          )
        );
      }
    } catch (error) {
      console.warn('Failed to refresh messages from Supabase', error);
    }
  }

  void refreshMessages();
  const realtimeChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        void refreshMessages();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void refreshMessages();
      }
    });

  return () => {
    cancelled = true;
    void supabase.removeChannel(realtimeChannel);
  };
}

export function subscribeConversationList(userId: string, onChange: () => void) {
  let cancelled = false;
  let refreshScheduled = false;

  function scheduleRefresh() {
    if (cancelled || refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    queueMicrotask(() => {
      refreshScheduled = false;
      if (!cancelled) {
        onChange();
      }
    });
  }

  const ownerChannel = supabase
    .channel(`conversations:owner:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `owner_uid=eq.${userId}`,
      },
      scheduleRefresh
    )
    .subscribe();

  const sitterChannel = supabase
    .channel(`conversations:sitter:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `sitter_uid=eq.${userId}`,
      },
      scheduleRefresh
    )
    .subscribe();

  return () => {
    cancelled = true;
    void supabase.removeChannel(ownerChannel);
    void supabase.removeChannel(sitterChannel);
  };
}

export async function markMessagesAsRead(
  ownerId: string,
  requestId: string,
  sitterId: string,
  userId: string
): Promise<void> {
  const conversationId = buildConversationId(requestId, ownerId, sitterId);
  const payload = await fetchSupabaseReadJson<{ messages: Array<Record<string, unknown>> }>(
    `/api/supabase-read/message?scope=messages&conversationId=${encodeURIComponent(conversationId)}`,
    { requireAuth: true }
  );

  const unreadMessageIds = payload.messages
    .filter((message) => (message.recipientId as string) === userId && message.read !== true)
    .map((message) => (message.id as string) || '')
    .filter(Boolean);

  if (!unreadMessageIds.length) {
    return;
  }

  await markMessagesReadInSupabase({
    actorId: userId,
    conversationId,
    recipientId: userId,
    messageIds: unreadMessageIds,
  });
}

export function subscribeUnreadCount(userId: string, onCount: (count: number) => void) {
  let cancelled = false;

  async function refreshUnreadCount() {
    try {
      if (!cancelled) {
        onCount(await fetchUnreadCountFromSupabase(userId));
      }
    } catch (error) {
      console.warn('Failed to refresh unread messages from Supabase', error);
    }
  }

  void refreshUnreadCount();
  const realtimeChannel = supabase
    .channel(`messages:unread:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_uid=eq.${userId}`,
      },
      () => {
        void refreshUnreadCount();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void refreshUnreadCount();
      }
    });

  return () => {
    cancelled = true;
    void supabase.removeChannel(realtimeChannel);
  };
}

export async function getLatestMessage(
  ownerId: string,
  requestId: string,
  sitterId: string
): Promise<Message | null> {
  const conversationId = buildConversationId(requestId, ownerId, sitterId);
  const payload = await fetchSupabaseReadJson<{ message: Record<string, unknown> | null }>(
    `/api/supabase-read/message?scope=latest-message&conversationId=${encodeURIComponent(conversationId)}`,
    { requireAuth: true }
  );

  if (!payload.message) {
    return null;
  }

  return {
    id: (payload.message.id as string) || '',
    conversationId: (payload.message.conversationId as string) || conversationId,
    ownerId: (payload.message.ownerId as string) || ownerId,
    requestId: (payload.message.requestId as string) || requestId,
    sitterId: (payload.message.sitterId as string) || sitterId,
    senderId: (payload.message.senderId as string) || '',
    senderName: (payload.message.senderName as string) || 'User',
    recipientId: (payload.message.recipientId as string) || '',
    text: (payload.message.text as string) || '',
    read: Boolean(payload.message.read),
    createdAt: toDate(payload.message.createdAt),
  };
}
