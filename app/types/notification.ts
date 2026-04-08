export type NotificationType =
  | 'direct_request_received'
  | 'application_received'
  | 'application_accepted'
  | 'message_received'
  | 'review_received'
  | 'request_completed';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  relatedRequestId?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  relatedRequestId?: string;
  message: string;
}
