import { apiCall } from './api';

export class NotificationService {
  static async getNotifications(token: string | null) {
    return apiCall('/notifications', { token });
  }

  static async getNotificationHistory(token: string | null) {
    return apiCall('/notifications/history', { token });
  }

  static async markRead(id: string, token: string | null) {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
      token
    });
  }

  static async markAllRead(token: string | null) {
    return apiCall('/notifications/read-all', {
      method: 'PUT',
      token
    });
  }

  static async deleteNotification(id: string, token: string | null) {
    return apiCall(`/notifications/${id}`, {
      method: 'DELETE',
      token
    });
  }
}

export default NotificationService;
