export type NotificationType =
  | 'notification:new'
  | 'notification:broadcast'
  | 'system:announcement'
  | 'wallet:updated'
  | 'match:result_ready'
  | 'match:submission_received'
  | 'match:postpone_response'
  | 'match:dispute_opened'
  | 'leaderboard:updated';

export interface NotificationPayload {
  type: NotificationType;
  title?: string;
  body?: string;
  route?: string;
  data?: Record<string, unknown>;
}