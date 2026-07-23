import { db, isFirebaseConfigured } from '../../firebaseConfig';
import { supabase } from './supabase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';

export interface AppNotification {
  id: string;
  _id?: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  targetRole: 'admin' | 'donor' | 'ngo' | 'volunteer' | 'all';
  referenceId: string;
}

export type NotificationEventType =
  | 'donor_registered'
  | 'ngo_registered'
  | 'volunteer_registered'
  | 'donation_created'
  | 'donation_accepted'
  | 'pickup_assigned'
  | 'pickup_completed'
  | 'delivery_completed'
  | 'donation_cancelled'
  | 'food_expiring'
  | 'profile_updated'
  | 'report_exported';

// Local in-memory store fallback if Firestore network/instance is unavailable
let localNotificationsMemory: AppNotification[] = [];
let localListeners: Array<(notifications: AppNotification[]) => void> = [];

const notifyLocalListeners = () => {
  const sorted = [...localNotificationsMemory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  localListeners.forEach(cb => cb(sorted));
};

export class FirestoreNotificationService {
  /**
   * Create a new real-time notification document in Firestore "notifications" collection
   */
  static async createNotification(params: {
    title: string;
    message: string;
    type: NotificationEventType | string;
    targetRole?: 'admin' | 'donor' | 'ngo' | 'volunteer' | 'all';
    referenceId?: string;
  }): Promise<string> {
    const payload = {
      title: params.title,
      message: params.message,
      type: params.type,
      createdAt: new Date().toISOString(),
      isRead: false,
      targetRole: params.targetRole || 'admin',
      referenceId: params.referenceId || ''
    };

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    if (isFirebaseConfigured() && db) {
      try {
        console.log('[FirestoreNotificationService.createNotification] Calling addDoc...');
        const docRef = await addDoc(collection(db, 'notifications'), payload);
        console.log('[FirestoreNotificationService.createNotification] addDoc finished, id:', docRef.id);
        return docRef.id;
      } catch (err) {
        console.warn('Firestore addDoc warning (falling back to memory):', err);
      }
    }

    // Memory fallback
    const memoryNotif: AppNotification = { id: notifId, _id: notifId, ...payload };
    localNotificationsMemory.unshift(memoryNotif);
    notifyLocalListeners();
    return notifId;
  }

  /**
   * Real-time Firestore listener for Admin Notifications (targetRole = 'admin' or 'all')
   * Updates instantly onSnapshot without requiring page refresh.
   */
  static subscribeAdminNotifications(onUpdate: (notifications: AppNotification[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        console.log('[FirestoreNotificationService.subscribeAdminNotifications] Setting up Firestore listener...');
        const q = query(
          collection(db, 'notifications'),
          where('targetRole', 'in', ['admin', 'all'])
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: AppNotification[] = snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                _id: d.id,
                title: data.title || '',
                message: data.message || '',
                type: data.type || 'info',
                createdAt: data.createdAt || new Date().toISOString(),
                isRead: Boolean(data.isRead),
                targetRole: data.targetRole || 'admin',
                referenceId: data.referenceId || ''
              };
            });

            // Order by newest first
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            // Sync with local memory cache
            localNotificationsMemory = list;
            onUpdate(list);
          },
          (err) => {
            console.warn('Firestore onSnapshot error (using memory cache):', err);
            onUpdate([...localNotificationsMemory]);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.warn('Failed to setup Firestore listener, using memory listener:', err);
      }
    }

    // Local memory subscription fallback
    localListeners.push(onUpdate);
    onUpdate([...localNotificationsMemory]);

    return () => {
      localListeners = localListeners.filter(cb => cb !== onUpdate);
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    if (!notificationId) return;

    if (isFirebaseConfigured() && db) {
      try {
        console.log('[FirestoreNotificationService.markAsRead] Calling updateDoc...');
        const docRef = doc(db, 'notifications', notificationId);
        await updateDoc(docRef, { isRead: true });
        console.log('[FirestoreNotificationService.markAsRead] updateDoc finished');
      } catch (err) {
        console.warn('Firestore updateDoc failed, updating memory:', err);
      }
    }

    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    } catch (err) {
      console.warn('Supabase mark read update warning:', err);
    }

    // Sync memory
    localNotificationsMemory = localNotificationsMemory.map(n =>
      n.id === notificationId || n._id === notificationId ? { ...n, isRead: true } : n
    );
    notifyLocalListeners();
  }

  /**
   * Mark all unread admin notifications as read
   */
  static async markAllAsRead(notifications: AppNotification[]): Promise<void> {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    if (isFirebaseConfigured() && db) {
      try {
        console.log('[FirestoreNotificationService.markAllAsRead] Calling batch commit...');
        const batch = writeBatch(db);
        unread.forEach(n => {
          const docRef = doc(db, 'notifications', n.id || n._id || '');
          batch.update(docRef, { isRead: true });
        });
        await batch.commit();
        console.log('[FirestoreNotificationService.markAllAsRead] batch commit finished');
      } catch (err) {
        console.warn('Firestore batch mark read failed, updating memory:', err);
      }
    }

    try {
      const unreadIds = unread.map(n => n.id || n._id).filter(Boolean);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (err) {
      console.warn('Supabase batch mark read update warning:', err);
    }

    // Sync memory
    localNotificationsMemory = localNotificationsMemory.map(n => ({ ...n, isRead: true }));
    notifyLocalListeners();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12 Mandatory Real-Time Application Event Creators
  // ─────────────────────────────────────────────────────────────────────────────

  static async notifyDonorRegistered(name: string, email: string, userId: string) {
    return this.createNotification({
      title: 'New Donor Registered 👤',
      message: `Donor ${name} (${email}) has registered on FoodReach.`,
      type: 'donor_registered',
      targetRole: 'admin',
      referenceId: userId
    });
  }

  static async notifyNgoRegistered(name: string, email: string, userId: string) {
    return this.createNotification({
      title: 'New NGO Registered 🏢',
      message: `NGO Foundation ${name} (${email}) has joined the network.`,
      type: 'ngo_registered',
      targetRole: 'admin',
      referenceId: userId
    });
  }

  static async notifyVolunteerRegistered(name: string, email: string, userId: string) {
    return this.createNotification({
      title: 'New Volunteer Registered 🚴',
      message: `Volunteer ${name} (${email}) signed up for food pickup operations.`,
      type: 'volunteer_registered',
      targetRole: 'admin',
      referenceId: userId
    });
  }

  static async notifyDonationCreated(foodType: string, quantity: number, unit: string, donorName: string, donationId: string) {
    return this.createNotification({
      title: 'New Food Donation Posted 🍲',
      message: `${donorName} posted ${quantity} ${unit} of ${foodType}.`,
      type: 'donation_created',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyDonationAccepted(foodType: string, ngoName: string, donationId: string) {
    return this.createNotification({
      title: 'Donation Accepted by NGO 🤝',
      message: `${ngoName} accepted donation of ${foodType}.`,
      type: 'donation_accepted',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyPickupAssigned(volunteerName: string, donationId: string) {
    return this.createNotification({
      title: 'Pickup Assigned 🚚',
      message: `Volunteer ${volunteerName} assigned to pickup donation #${donationId.slice(0, 6)}.`,
      type: 'pickup_assigned',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyPickupCompleted(volunteerName: string, donationId: string) {
    return this.createNotification({
      title: 'Pickup Completed 📦',
      message: `Volunteer ${volunteerName} completed food pickup for #${donationId.slice(0, 6)}.`,
      type: 'pickup_completed',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyDeliveryCompleted(volunteerName: string, donationId: string) {
    return this.createNotification({
      title: 'Food Delivery Completed 🎉',
      message: `Delivery for donation #${donationId.slice(0, 6)} successfully handed over by ${volunteerName}.`,
      type: 'delivery_completed',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyDonationCancelled(donorName: string, donationId: string) {
    return this.createNotification({
      title: 'Donation Cancelled 🚫',
      message: `Donation #${donationId.slice(0, 6)} was cancelled by ${donorName}.`,
      type: 'donation_cancelled',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyFoodExpiringSoon(foodType: string, hoursRemaining: number, donationId: string) {
    return this.createNotification({
      title: 'Food Expiring Soon Alert ⏰',
      message: `Warning: ${foodType} donation #${donationId.slice(0, 6)} expires in ${hoursRemaining} hours!`,
      type: 'food_expiring',
      targetRole: 'admin',
      referenceId: donationId
    });
  }

  static async notifyProfileUpdated(userName: string, userId: string) {
    return this.createNotification({
      title: 'User Profile Updated ✏️',
      message: `User ${userName} updated their profile information.`,
      type: 'profile_updated',
      targetRole: 'admin',
      referenceId: userId
    });
  }

  static async notifyReportExported(reportType: string, format: string) {
    return this.createNotification({
      title: 'Report Exported 📄',
      message: `System ${reportType.toUpperCase()} report exported in ${format.toUpperCase()} format.`,
      type: 'report_exported',
      targetRole: 'admin',
      referenceId: `report_${Date.now()}`
    });
  }
}

export default FirestoreNotificationService;
