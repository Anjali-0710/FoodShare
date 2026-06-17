import { supabase } from './supabase';

export class NotificationService {
  /**
   * Get notifications for the current user
   */
  static async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data ?? []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title ?? '',
      message: row.message ?? '',
      type: row.type ?? 'info',
      isRead: row.is_read,
      relatedDonationId: row.related_donation_id ?? undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Mark a notification as read
   */
  static async markRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  /**
   * Create a notification for a user
   */
  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedDonationId?: string;
  }) {
    const { error } = await supabase.from('notifications').insert({
      user_id: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      related_donation_id: data.relatedDonationId ?? null,
      is_read: false,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  static subscribeToNotifications(userId: string, onNew: (notification: any) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new;
          onNew({
            id: row.id,
            userId: row.user_id,
            title: row.title ?? '',
            message: row.message ?? '',
            type: row.type ?? 'info',
            isRead: row.is_read,
            relatedDonationId: row.related_donation_id ?? undefined,
            createdAt: row.created_at,
          });
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from realtime channel
   */
  static unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  }
}

export default NotificationService;
