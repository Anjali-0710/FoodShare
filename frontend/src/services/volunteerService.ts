import { supabase } from './supabase';
import { DonationService } from './donationService';
import { NotificationService } from './notificationService';

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
      });
    }
    if (data.ngo_id) {
      await NotificationService.createNotification({
        userId: data.ngo_id,
        title: '🚗 Volunteer En Route',
        message: `${volunteerName} has been assigned to deliver your donation.`,
        type: 'volunteer_assigned',
        relatedDonationId: donationId,
      });
    }

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
    await supabase.from('system_logs').insert({
      action: `Donation ${status}`,
      performed_by: volunteerId,
      role: 'volunteer',
      details: `Donation ${donationId} status updated to ${status}`,
    });

    // Notify donor when delivered/completed
    if ((status === 'Delivered' || status === 'Completed') && data.donor_id) {
      await NotificationService.createNotification({
        userId: data.donor_id,
        title: '✅ Donation Delivered!',
        message: `Your donation has been successfully delivered to ${data.ngo_name ?? 'the NGO'}.`,
        type: 'donation_delivered',
        relatedDonationId: donationId,
      });
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
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('qr_code', qrCode)
      .single();

    if (error) throw new Error('Invalid QR code');
    return data;
  }
}

export default VolunteerService;
