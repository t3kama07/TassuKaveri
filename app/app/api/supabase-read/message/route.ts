import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  getConversationByIdFromSupabase,
  getConversationMessagesFromSupabase,
  getLatestMessageFromSupabase,
  getUnreadMessageCountFromSupabase,
  getUserConversationsFromSupabase,
} from '@/lib/supabaseMessageStore';

function userCanAccessConversation(
  userId: string,
  conversation: {
    owner_uid: string;
    sitter_uid: string;
    participants: string[] | null;
  }
): boolean {
  if (conversation.owner_uid === userId || conversation.sitter_uid === userId) {
    return true;
  }

  return Array.isArray(conversation.participants) && conversation.participants.includes(userId);
}

export async function GET(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const scope = request.nextUrl.searchParams.get('scope');

    if (scope === 'conversations') {
      const userId = request.nextUrl.searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }
      if (userId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden conversation read target' }, { status: 403 });
      }

      const conversations = await getUserConversationsFromSupabase(userId);
      return NextResponse.json({ conversations });
    }

    if (scope === 'latest-message') {
      const conversationId = request.nextUrl.searchParams.get('conversationId');
      if (!conversationId) {
        return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
      }

      const conversation = await getConversationByIdFromSupabase(conversationId);
      if (!conversation) {
        return NextResponse.json({ message: null });
      }

      if (!userCanAccessConversation(sessionUser.uid, conversation)) {
        return NextResponse.json({ error: 'Forbidden latest message read target' }, { status: 403 });
      }

      const message = await getLatestMessageFromSupabase(conversationId);
      return NextResponse.json({ message });
    }

    if (scope === 'messages') {
      const conversationId = request.nextUrl.searchParams.get('conversationId');
      if (!conversationId) {
        return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
      }

      const conversation = await getConversationByIdFromSupabase(conversationId);
      if (!conversation) {
        return NextResponse.json({ messages: [] });
      }

      if (!userCanAccessConversation(sessionUser.uid, conversation)) {
        return NextResponse.json({ error: 'Forbidden message read target' }, { status: 403 });
      }

      const messages = await getConversationMessagesFromSupabase(conversationId);
      return NextResponse.json({ messages });
    }

    if (scope === 'unread-count') {
      const userId = request.nextUrl.searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }
      if (userId !== sessionUser.uid) {
        return NextResponse.json({ error: 'Forbidden unread count read target' }, { status: 403 });
      }

      const unreadCount = await getUnreadMessageCountFromSupabase(userId);
      return NextResponse.json({ unreadCount });
    }

    return NextResponse.json({ error: 'Invalid message read scope' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected message read failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

