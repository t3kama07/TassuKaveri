import { createSupabaseAdminClient } from './supabaseAdmin';
import { Conversation, Message } from '@/types/message';

type DateInput = Date | string | number | null | undefined;
type SupabaseConversationRow = {
  id: string;
  owner_uid: string;
  request_id: string;
  sitter_uid: string;
  owner_name: string;
  sitter_name: string;
  title: string;
  subtitle: string;
  status: string;
  participants: string[] | null;
  last_message: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};
type SupabaseMessageRow = {
  id: string;
  conversation_id: string;
  owner_uid: string;
  request_id: string;
  sitter_uid: string;
  sender_uid: string;
  sender_name: string;
  recipient_uid: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export interface SupabaseConversationInput {
  conversationId: string;
  ownerId: string;
  requestId: string;
  sitterId: string;
  ownerName?: string;
  sitterName?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  participants?: string[];
  lastMessage?: string;
  lastMessageAt?: DateInput;
  createdAt?: DateInput;
  updatedAt?: DateInput;
}

export interface SupabaseMessageInput {
  id: string;
  conversationId: string;
  ownerId: string;
  requestId: string;
  sitterId: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  text?: string;
  read?: boolean;
  createdAt?: DateInput;
  updatedAt?: DateInput;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
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

function mapConversationToSupabaseRow(
  conversation: SupabaseConversationInput
): Record<string, unknown> {
  const now = new Date();

  return {
    id: conversation.conversationId,
    owner_uid: conversation.ownerId,
    request_id: conversation.requestId,
    sitter_uid: conversation.sitterId,
    owner_name: asString(conversation.ownerName, 'Owner'),
    sitter_name: asString(conversation.sitterName, 'Sitter'),
    title: asString(conversation.title, 'Conversation'),
    subtitle: asString(conversation.subtitle),
    status: asString(conversation.status, 'open'),
    participants: asStringArray(conversation.participants),
    last_message: asString(conversation.lastMessage),
    last_message_at: conversation.lastMessageAt
      ? toIsoString(conversation.lastMessageAt, now)
      : null,
    created_at: toIsoString(conversation.createdAt, now),
    updated_at: toIsoString(conversation.updatedAt, now),
  };
}

function mapMessageToSupabaseRow(message: SupabaseMessageInput): Record<string, unknown> {
  const now = new Date();

  return {
    id: message.id,
    conversation_id: message.conversationId,
    owner_uid: message.ownerId,
    request_id: message.requestId,
    sitter_uid: message.sitterId,
    sender_uid: message.senderId,
    sender_name: asString(message.senderName, 'User'),
    recipient_uid: message.recipientId,
    body: asString(message.text),
    is_read: Boolean(message.read),
    created_at: toIsoString(message.createdAt, now),
    updated_at: toIsoString(message.updatedAt, now),
  };
}

function mapSupabaseConversationRow(
  row: SupabaseConversationRow,
  userId: string
): Conversation {
  const isOwner = row.owner_uid === userId;

  return {
    conversationId: row.id,
    ownerId: row.owner_uid,
    requestId: row.request_id,
    sitterId: row.sitter_uid,
    ownerName: row.owner_name || 'Owner',
    sitterName: row.sitter_name || 'Sitter',
    title: row.title || 'Conversation',
    subtitle: row.subtitle || '',
    otherUserId: isOwner ? row.sitter_uid : row.owner_uid,
    otherUserName: isOwner ? row.sitter_name || 'Sitter' : row.owner_name || 'Owner',
    status: row.status || 'open',
  };
}

function mapSupabaseMessageRow(row: SupabaseMessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    ownerId: row.owner_uid,
    requestId: row.request_id,
    sitterId: row.sitter_uid,
    senderId: row.sender_uid,
    senderName: row.sender_name || 'User',
    recipientId: row.recipient_uid,
    text: row.body || '',
    read: Boolean(row.is_read),
    createdAt: toDate(row.created_at),
  };
}

export async function upsertConversationInSupabase(
  conversation: SupabaseConversationInput
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('conversations')
    .upsert(mapConversationToSupabaseRow(conversation), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert conversation in Supabase: ${error.message}`);
  }
}

export async function upsertMessageInSupabase(message: SupabaseMessageInput): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('messages')
    .upsert(mapMessageToSupabaseRow(message), { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert message in Supabase: ${error.message}`);
  }
}

export async function markMessagesAsReadInSupabase(params: {
  conversationId: string;
  recipientId: string;
  messageIds: string[];
}): Promise<void> {
  if (!params.messageIds.length) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', params.conversationId)
    .eq('recipient_uid', params.recipientId)
    .in('id', params.messageIds);

  if (error) {
    throw new Error(`Failed to mark messages as read in Supabase: ${error.message}`);
  }
}

export async function getConversationByIdFromSupabase(
  conversationId: string
): Promise<SupabaseConversationRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle<SupabaseConversationRow>();

  if (error) {
    throw new Error(`Failed to read conversation from Supabase: ${error.message}`);
  }

  return data ?? null;
}

export async function getUserConversationsFromSupabase(
  userId: string
): Promise<Conversation[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participants', [userId])
    .order('updated_at', { ascending: false })
    .returns<SupabaseConversationRow[]>();

  if (error) {
    throw new Error(`Failed to read conversations from Supabase: ${error.message}`);
  }

  return (data || []).map((row) => mapSupabaseConversationRow(row, userId));
}

export async function getLatestMessageFromSupabase(
  conversationId: string
): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<SupabaseMessageRow[]>();

  if (error) {
    throw new Error(`Failed to read latest message from Supabase: ${error.message}`);
  }

  const row = data?.[0];
  return row ? mapSupabaseMessageRow(row) : null;
}

export async function getConversationMessagesFromSupabase(
  conversationId: string
): Promise<Message[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .returns<SupabaseMessageRow[]>();

  if (error) {
    throw new Error(`Failed to read messages from Supabase: ${error.message}`);
  }

  return (data || []).map(mapSupabaseMessageRow);
}

export async function getUnreadMessageCountFromSupabase(userId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_uid', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(`Failed to count unread messages in Supabase: ${error.message}`);
  }

  return count ?? 0;
}

export async function deleteConversationsForRequestFromSupabase(requestId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('request_id', requestId);

  if (error) {
    throw new Error(`Failed to delete request conversations from Supabase: ${error.message}`);
  }
}
