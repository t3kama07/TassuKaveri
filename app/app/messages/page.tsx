'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLatestMessage,
  getUserConversations,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
  subscribeUnreadCount,
} from '@/lib/messageService';
import { Conversation, Message } from '@/types/message';

interface ConversationWithMeta extends Conversation {
  latestMessageText?: string;
  latestMessageAt?: Date;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeUnreadCount(user.uid, setUnreadCount);
    return () => unsubscribe();
  }, [user]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversationId === selectedConversationId),
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!user || !selectedConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      selectedConversation.ownerId,
      selectedConversation.requestId,
      selectedConversation.sitterId,
      (nextMessages) => {
        setMessages(nextMessages);
      }
    );

    markMessagesAsRead(
      selectedConversation.ownerId,
      selectedConversation.requestId,
      selectedConversation.sitterId,
      user.uid
    ).catch(() => {
      // Non-blocking.
    });

    return () => unsubscribe();
  }, [user, selectedConversation]);

  async function loadConversations() {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const baseConversations = await getUserConversations(user.uid);
      const conversationsWithPreview = await Promise.all(
        baseConversations.map(async (conversation) => {
          const latestMessage = await getLatestMessage(
            conversation.ownerId,
            conversation.requestId,
            conversation.sitterId
          );
          return {
            ...conversation,
            latestMessageText: latestMessage?.text,
            latestMessageAt: latestMessage?.createdAt,
          };
        })
      );

      conversationsWithPreview.sort((a, b) => {
        const aTime = a.latestMessageAt?.getTime() || 0;
        const bTime = b.latestMessageAt?.getTime() || 0;
        return bTime - aTime;
      });

      setConversations(conversationsWithPreview);
      if (conversationsWithPreview.length > 0) {
        setSelectedConversationId((current) => current || conversationsWithPreview[0].conversationId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to load conversations: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!user || !selectedConversation || !draft.trim()) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      await sendMessage(
        selectedConversation.ownerId,
        selectedConversation.requestId,
        selectedConversation.sitterId,
        user.uid,
        draft
      );
      setDraft('');
      setSuccess('Message sent.');
      await markMessagesAsRead(
        selectedConversation.ownerId,
        selectedConversation.requestId,
        selectedConversation.sitterId,
        user.uid
      );
      await loadConversations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to send message: ' + message);
    } finally {
      setSending(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#0f2640]">Messages</h1>
          <p className="text-sm text-[#6b7280]">Unread: {unreadCount}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">
              No conversations yet. Conversations start when applications are created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
              {conversations.map((conversation) => {
                const selected = selectedConversationId === conversation.conversationId;

                return (
                  <button
                    key={conversation.conversationId}
                    onClick={() => setSelectedConversationId(conversation.conversationId)}
                    className={`w-full text-left p-3 rounded border ${
                      selected ? 'border-[#ff7a2d] bg-[#fff7f2]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-[#0f2640]">{conversation.title}</p>
                    <p className="text-sm text-[#6b7280]">With: {conversation.otherUserName}</p>
                    <p className="text-xs text-[#6b7280]">{conversation.subtitle}</p>
                    {conversation.latestMessageText && (
                      <p className="text-xs text-[#6b7280] mt-1 truncate">{conversation.latestMessageText}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-[65vh]">
              {!selectedConversation ? (
                <p className="text-[#6b7280]">Select a conversation.</p>
              ) : (
                <>
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p className="font-semibold text-[#0f2640]">{selectedConversation.title}</p>
                    <p className="text-sm text-[#6b7280]">With: {selectedConversation.otherUserName}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {messages.length === 0 ? (
                      <p className="text-[#6b7280] text-sm">No messages yet.</p>
                    ) : (
                      messages.map((message) => {
                        const mine = message.senderId === user?.uid;
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[80%] px-3 py-2 rounded ${
                              mine
                                ? 'ml-auto bg-[#ff7a2d] text-white'
                                : 'mr-auto bg-gray-100 text-[#0f2640]'
                            }`}
                          >
                            <p className="text-xs opacity-80 mb-1">{message.senderName}</p>
                            <p className="text-sm">{message.text}</p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !draft.trim()}
                      className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
