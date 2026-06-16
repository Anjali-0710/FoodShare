import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { getDbStatus } from '../config/db';
import { mockUsers } from '../config/mockDb';

// Global mock list to persist notifications while backend is running in-memory
export const mockNotifications: any[] = [
  {
    _id: 'mock_notif_1',
    userId: 'usr_ngo_1',
    role: 'ngo',
    type: 'new_donation',
    title: 'New Donation Available! 🍎',
    message: '80 Plates of Fresh Biryani listed near Koramangala.',
    donationId: 'c002',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60000)
  },
  {
    _id: 'mock_notif_2',
    userId: 'usr_volunteer_1',
    role: 'volunteer',
    type: 'pickup_reminder',
    title: 'Pickup Reminder ⏰',
    message: 'Remember to pick up your assigned bread donation from Modern Bakery.',
    donationId: 'c001',
    read: false,
    createdAt: new Date(Date.now() - 120 * 60000)
  },
  {
    _id: 'mock_notif_3',
    userId: 'usr_donor_1',
    role: 'donor',
    type: 'accepted',
    title: 'Donation Accepted! 🎉',
    message: 'Your surplus mixed vegetables donation has been accepted by Care & Feed Foundation NGO.',
    donationId: 'c003',
    read: true,
    createdAt: new Date(Date.now() - 10 * 3600000)
  }
];

// Helper to create notifications programmatically
export const createNotificationInternal = async (params: {
  userId: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  type: string;
  title: string;
  message: string;
  donationId?: string;
}) => {
  try {
    const isDb = getDbStatus();
    if (isDb) {
      await Notification.create({
        userId: params.userId,
        role: params.role,
        type: params.type,
        title: params.title,
        message: params.message,
        donationId: params.donationId || undefined,
        read: false
      });
    } else {
      mockNotifications.unshift({
        _id: `mock_notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: params.userId,
        role: params.role,
        type: params.type,
        title: params.title,
        message: params.message,
        donationId: params.donationId || undefined,
        read: false,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('Failed to create notification internally:', error);
  }
};

// GET /api/notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;
    let list: any[] = [];

    if (isDb) {
      list = await Notification.find({ userId }).sort({ createdAt: -1 });
    } else {
      list = mockNotifications.filter(n => n.userId === userId);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return res.status(200).json({ success: true, notifications: list });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

// PUT /api/notifications/:id/read
export const markRead = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;
    let updated: any = null;

    if (isDb) {
      updated = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { read: true },
        { new: true }
      );
    } else {
      const idx = mockNotifications.findIndex(n => n._id === id && n.userId === userId);
      if (idx !== -1) {
        mockNotifications[idx].read = true;
        updated = mockNotifications[idx];
      }
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found or not owned by you' });
    }

    return res.status(200).json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;

    if (isDb) {
      await Notification.updateMany({ userId, read: false }, { read: true });
    } else {
      mockNotifications.forEach(n => {
        if (n.userId === userId) n.read = true;
      });
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Server error marking all notifications read' });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;
    let deleted = false;

    if (isDb) {
      const result = await Notification.findOneAndDelete({ _id: id, userId });
      if (result) deleted = true;
    } else {
      const idx = mockNotifications.findIndex(n => n._id === id && n.userId === userId);
      if (idx !== -1) {
        mockNotifications.splice(idx, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found or not owned by you' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
};

// GET /api/notifications/history (Admin or Audit log overview)
export const getNotificationHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    const userRole = req.user!.role;
    let list: any[] = [];

    if (userRole === 'admin') {
      if (isDb) {
        list = await Notification.find({}).populate('userId', 'name email role').sort({ createdAt: -1 });
      } else {
        // Map mock notifications with user details
        list = mockNotifications.map(n => {
          const u = mockUsers.find(usr => usr.id === n.userId);
          return {
            ...n,
            userDetails: u ? { name: u.name, email: u.email, role: u.role } : { name: 'Unknown User', email: 'unknown@email.com', role: n.role }
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } else {
      // Non-admins can only see their own history log
      const userId = req.user!.id;
      if (isDb) {
        list = await Notification.find({ userId }).populate('userId', 'name email role').sort({ createdAt: -1 });
      } else {
        list = mockNotifications.filter(n => n.userId === userId).map(n => {
          const u = mockUsers.find(usr => usr.id === n.userId);
          return {
            ...n,
            userDetails: u ? { name: u.name, email: u.email, role: u.role } : null
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }

    return res.status(200).json({ success: true, history: list });
  } catch (error: any) {
    console.error('Get notification history error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving notification history log' });
  }
};
