import { supabase } from './supabase';
import { DonationService } from './donationService';
import { NotificationService } from './notificationService';
import { FirestoreNotificationService } from './FirestoreNotificationService';

export class VolunteerService {
  /**
   * Get available pickups (Accepted status — NGO accepted, awaiting volunteer)
   */
  static async getAvailablePickups() {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('status', 'Accepted')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * Get pickups assigned to a specific volunteer
   */
  static async getAssignedPickups(volunteerId: string) {
    return DonationService.getVolunteerPickups(volunteerId);
  }

  /**
   * Claim/assign a pickup to a volunteer
   */
  static async claimPickup(donationId: string, volunteerId: string, volunteerName: string) {
    const { data, error } = await supabase
      .from('donations')
      .update({
        volunteer_id: volunteerId,
        volunteer_name: volunteerName,
        status: 'Assigned',
      })
      .eq('id', donationId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Notify donor and NGO
    if (data.donor_id) {
      await NotificationService.createNotification({
        userId: data.donor_id,
        title: '🚗 Volunteer Assigned',
        message: `${volunteerName} has been assigned to pick up your donation.`,
        type: 'volunteer_assigned',
        relatedDonationId: donationId,
      }).catch((err: any) => console.error(err));
    }
    if (data.ngo_id) {
      await NotificationService.createNotification({
        userId: data.ngo_id,
        title: '🚗 Volunteer En Route',
        message: `${volunteerName} has been assigned to deliver your donation.`,
        type: 'volunteer_assigned',
        relatedDonationId: donationId,
      }).catch((err: any) => console.error(err));
    }

    // Notify volunteer
    await NotificationService.createNotification({
      userId: volunteerId,
      title: 'Transport Claimed!',
      message: `You claimed transport for ${data.quantity} ${data.unit} of ${data.food_type} from ${data.donor_name}.`,
      type: 'volunteer_assigned',
      relatedDonationId: donationId,
    }).catch((err: any) => console.error(err));

    // Real-time Admin Firestore Notification
    await FirestoreNotificationService.notifyPickupAssigned(volunteerName, donationId).catch(console.error);

    return data;
  }

  /**
   * Update delivery status (Picked Up / Delivered)
   */
  static async updateStatus(donationId: string, status: 'Picked Up' | 'Delivered' | 'Completed' | 'Cancelled', volunteerId: string) {
    const { data, error } = await supabase
      .from('donations')
      .update({ status })
      .eq('id', donationId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log system activity
    try {
      await supabase.from('system_logs').insert({
        action: `Donation ${status}`,
        performed_by: volunteerId,
        role: 'volunteer',
        details: `Donation ${donationId} status updated to ${status}`,
      });
    } catch (err) {
      console.error('Failed to insert system log:', err);
    }

    // When status is updated to Picked Up
    if (status === 'Picked Up') {
      if (data.donor_id) {
        await NotificationService.createNotification({
          userId: data.donor_id,
          title: 'Food Picked Up! 🚗',
          message: `Volunteer ${data.volunteer_name || 'A volunteer'} has picked up your surplus food.`,
          type: 'pickup_started',
          relatedDonationId: donationId,
        }).catch((err: any) => console.error(err));
      }
      if (data.ngo_id) {
        await NotificationService.createNotification({
          userId: data.ngo_id,
          title: 'Food On The Way! 🚗',
          message: `Volunteer ${data.volunteer_name || 'A volunteer'} has picked up the food and is en route.`,
          type: 'pickup_started',
          relatedDonationId: donationId,
        }).catch((err: any) => console.error(err));
      }
      await NotificationService.createNotification({
        userId: volunteerId,
        title: 'Cargo Loaded! 📦',
        message: `Cargo loaded. Drive to dropoff location for ${data.ngo_name || 'the NGO'}.`,
        type: 'pickup_started',
        relatedDonationId: donationId,
      }).catch((err: any) => console.error(err));
    }

    // When status is updated to Delivered
    if (status === 'Delivered') {
      if (data.ngo_id) {
        await NotificationService.createNotification({
          userId: data.ngo_id,
          title: 'Volunteer Arrived! 🏢',
          message: `Volunteer ${data.volunteer_name || 'A volunteer'} arrived with your food donation. Open details to scan QR and finalize.`,
          type: 'delivery_arrived',
          relatedDonationId: donationId,
        }).catch((err: any) => console.error(err));
      }
      await NotificationService.createNotification({
        userId: volunteerId,
        title: 'Arrived at Dropoff 📍',
        message: `Cargo delivered. Request the NGO representative to scan the verification code.`,
        type: 'delivery_arrived',
        relatedDonationId: donationId,
      }).catch((err: any) => console.error(err));

      if (data.donor_id) {
        await NotificationService.createNotification({
          userId: data.donor_id,
          title: '✅ Donation Delivered!',
          message: `Your donation has been successfully delivered to ${data.ngo_name ?? 'the NGO'}.`,
          type: 'donation_delivered',
          relatedDonationId: donationId,
        }).catch((err: any) => console.error(err));
      }
    }

    return data;
  }

  /**
   * Get volunteer leaderboard
   */
  static async getLeaderboard() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, volunteer_score, completed_pickups')
      .eq('role', 'volunteer')
      .eq('is_active', true)
      .order('volunteer_score', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return (data ?? []).map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      volunteerScore: p.volunteer_score,
      completedPickups: p.completed_pickups,
    }));
  }

  /**
   * Verify QR code for a donation
   */
  static async verifyQrCode(qrCode: string) {
    const { data: donation, error } = await supabase
      .from('donations')
      .select('*')
      .eq('qr_code', qrCode)
      .single();

    if (error || !donation) throw new Error('Invalid QR code');

    const { data: updated, error: updateError } = await supabase
      .from('donations')
      .update({ status: 'Completed' })
      .eq('id', donation.id)
      .select()
      .single();

    if (updateError || !updated) throw new Error(updateError?.message || 'Failed to update donation status to Completed');

    // Log system activity
    try {
      await supabase.from('system_logs').insert({
        action: 'Donation Completed',
        performed_by: updated.volunteer_id,
        role: 'volunteer',
        details: `Donation ${updated.id} successfully verified and completed`,
      });
    } catch (err) {
      console.error('Failed to log donation completion:', err);
    }

    // Update volunteer profile score (+50 karma points)
    if (updated.volunteer_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('volunteer_score, completed_pickups')
          .eq('id', updated.volunteer_id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              volunteer_score: (profile.volunteer_score || 0) + 50,
              completed_pickups: (profile.completed_pickups || 0) + 1,
            })
            .eq('id', updated.volunteer_id);
        }
      } catch (profileErr) {
        console.error('Failed to update volunteer profile score:', profileErr);
      }
    }

    // Insert notification records
    if (updated.donor_id) {
      await NotificationService.createNotification({
        userId: updated.donor_id,
        title: 'Donation Completed! 🎉',
        message: `Your donation of ${updated.quantity} ${updated.unit} of ${updated.food_type} has been successfully verified and delivered.`,
        type: 'completion_confirmation',
        relatedDonationId: updated.id,
      }).catch((err: any) => console.error(err));
    }

    if (updated.ngo_id) {
      await NotificationService.createNotification({
        userId: updated.ngo_id,
        title: 'Donation Received! 📦',
        message: `QR code successfully verified. Food donation of ${updated.quantity} ${updated.unit} of ${updated.food_type} marked completed.`,
        type: 'completion_confirmation',
        relatedDonationId: updated.id,
      }).catch((err: any) => console.error(err));
    }

    if (updated.volunteer_id) {
      await NotificationService.createNotification({
        userId: updated.volunteer_id,
        title: 'Task Completed! 🏆',
        message: `Success! Delivery completed. You have earned +50 Karma points.`,
        type: 'completion_confirmation',
        relatedDonationId: updated.id,
      }).catch((err: any) => console.error(err));
    }

    return updated;
  }
}

export default VolunteerService;
