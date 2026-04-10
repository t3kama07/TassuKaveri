import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  markMessagesAsReadInSupabase,
  type SupabaseConversationInput,
  type SupabaseMessageInput,
  upsertConversationInSupabase,
  upsertMessageInSupabase,
} from '@/lib/supabaseMessageStore';

type MessageSyncPayload =
  | {
      action: 'upsert-conversation';
      actorId?: string;
      conversation?: Partial<SupabaseConversationInput>;
    }
  | {
      action: 'upsert-message';
      actorId?: string;
      conversation?: Partial<SupabaseConversationInput>;
      message?: Partial<SupabaseMessageInput>;
    }
  | {
      action: 'mark-read';
      actorId?: string;
      conversationId?: string;
      recipientId?: string;
      messageIds?: string[];
    };

function isMessageSyncPayload(value: unknown): value is MessageSyncPayload {
  return Boolean(value && typeof value === 'object' && 'action' in value);
}

function isConversationParticipant(
  actorId: string,
  conversation: Pick<SupabaseConversationInput, 'ownerId' | 'sitterId'>
): boolean {
  return actorId === conversation.ownerId || actorId === conversation.sitterId;
}

export async function POST(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const payload = await request.json();
    if (!isMessageSyncPayload(payload)) {
      return NextResponse.json({ error: 'Invalid message sync payload' }, { status: 400 });
    }

    if (typeof payload.actorId === 'string' && payload.actorId !== sessionUser.uid) {
      return NextResponse.json({ error: 'Actor mismatch for message sync' }, { status: 403 });
    }

    if (payload.action === 'mark-read') {
      if (
        typeof payload.actorId !== 'string' ||
        typeof payload.conversationId !== 'string' ||
        typeof payload.recipientId !== 'string' ||
        !Array.isArray(payload.messageIds)
      ) {
        return NextResponse.json(
          { error: 'conversationId, recipientId, and messageIds are required' },
          { status: 400 }
        );
      }

      if (payload.actorId !== payload.recipientId) {
        return NextResponse.json(
          { error: 'Only the recipient can mark messages as read' },
          { status: 403 }
        );
      }

      await markMessagesAsReadInSupabase({
        conversationId: payload.conversationId,
        recipientId: payload.recipientId,
        messageIds: payload.messageIds.filter(
          (messageId): messageId is string => typeof messageId === 'string'
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (!payload.conversation || typeof payload.conversation !== 'object') {
      return NextResponse.json({ error: 'Conversation payload is required' }, { status: 400 });
    }

    const conversation = payload.conversation;
    if (
      typeof conversation.conversationId !== 'string' ||
      typeof conversation.ownerId !== 'string' ||
      typeof conversation.requestId !== 'string' ||
      typeof conversation.sitterId !== 'string'
    ) {
      return NextResponse.json(
        { error: 'conversationId, ownerId, requestId, and sitterId are required' },
        { status: 400 }
      );
    }

    if (typeof payload.actorId !== 'string') {
      return NextResponse.json({ error: 'actorId is required' }, { status: 400 });
    }

    if (!isConversationParticipant(payload.actorId, conversation as SupabaseConversationInput)) {
      return NextResponse.json({ error: 'Forbidden conversation sync target' }, { status: 403 });
    }

    await upsertConversationInSupabase(conversation as SupabaseConversationInput);

    if (payload.action === 'upsert-conversation') {
      return NextResponse.json({ ok: true });
    }

    if (!payload.message || typeof payload.message !== 'object') {
      return NextResponse.json({ error: 'Message payload is required' }, { status: 400 });
    }

    const message = payload.message;
    if (
      typeof message.id !== 'string' ||
      typeof message.conversationId !== 'string' ||
      typeof message.ownerId !== 'string' ||
      typeof message.requestId !== 'string' ||
      typeof message.sitterId !== 'string' ||
      typeof message.senderId !== 'string' ||
      typeof message.recipientId !== 'string'
    ) {
      return NextResponse.json(
        {
          error:
            'Message id, conversationId, ownerId, requestId, sitterId, senderId, and recipientId are required',
        },
        { status: 400 }
      );
    }

    if (message.senderId !== payload.actorId) {
      return NextResponse.json({ error: 'Message sender must match actor' }, { status: 403 });
    }

    if (message.recipientId !== conversation.ownerId && message.recipientId !== conversation.sitterId) {
      return NextResponse.json(
        { error: 'Message recipient must be a conversation participant' },
        { status: 400 }
      );
    }

    await upsertMessageInSupabase(message as SupabaseMessageInput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected message sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

