export interface Message {
  id: string;
  conversationId: string;
  ownerId: string;
  requestId: string;
  sitterId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  conversationId: string;
  ownerId: string;
  requestId: string;
  sitterId: string;
  title: string;
  subtitle: string;
  otherUserId: string;
  otherUserName: string;
  status: string;
}
