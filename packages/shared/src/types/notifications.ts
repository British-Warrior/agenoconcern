export type NotificationType =
  | 'challenge_match'
  | 'circle_formed'
  | 'circle_activity'
  | 'wellbeing_reminder'
  | 'resolution_feedback'
  | 'payment_received';

export type NotifyCircleActivity = 'immediate' | 'daily_digest' | 'off';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  notifyCircleActivity: NotifyCircleActivity;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
