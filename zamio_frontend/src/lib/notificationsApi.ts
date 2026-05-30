/**
 * Notifications API functions and types
 * All field names use snake_case to match backend responses
 */
import authApi, { type ApiEnvelope } from './api';

// ===== TYPES =====

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string | null;
  time_ago: string;
}

export interface NotificationStats {
  total_count: number;
  unread_count: number;
  read_count: number;
}

export interface NotificationPagination {
  page_number: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  stats: NotificationStats;
  pagination: NotificationPagination;
}

export interface NotificationsParams {
  artist_id: string;
  search?: string;
  filter_type?: string;
  filter_read?: 'read' | 'unread' | '';
  order_by?: 'Title' | 'Newest' | 'Oldest' | 'Type';
  page?: number;
}

export interface MarkReadParams {
  notification_id: number;
}

export interface MarkAllReadParams {
  artist_id: string;
}

export interface DeleteNotificationParams {
  notification_id: number;
}

// ===== API FUNCTIONS =====

/**
 * Fetch paginated notifications for an artist
 */
export const fetchNotifications = async (params: NotificationsParams): Promise<NotificationsData> => {
  const { data } = await authApi.get<ApiEnvelope<NotificationsData>>(
    '/api/notifications/artist/',
    { params }
  );
  return data.data;
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (params: MarkReadParams): Promise<void> => {
  await authApi.post('/api/notifications/mark-read/', params);
};

/**
 * Mark all notifications as read for an artist
 */
export const markAllNotificationsRead = async (params: MarkAllReadParams): Promise<{ updated_count: number }> => {
  const { data } = await authApi.post<ApiEnvelope<{ updated_count: number }>>(
    '/api/notifications/mark-all-read/',
    params
  );
  return data.data;
};

/**
 * Delete (archive) a notification
 */
export const deleteNotification = async (params: DeleteNotificationParams): Promise<void> => {
  await authApi.delete('/api/notifications/delete/', { data: params });
};
