import { supabase } from './supabase';
import { NotificationService } from './notificationService';

export interface DonationItem {
  id: string;
  foodType: string;
  quantity: number;
  unit: string;
  bestBeforeDate: string;
  preparationTime: string;
  temperature: number;
  donorId: string;
  donorName: string;
  ngoId?: string;
  ngoName?: string;
  volunteerId?: string;
  volunteerName?: string;
  status: 'Pending' | 'Accepted' | 'Assigned' | 'Picked Up' | 'Delivered' | 'Completed' | 'Cancelled';
  pickupAddress: string;
  gpsLocation: { latitude: number; longitude: number };
  contactNumber: string;
  additionalNotes: string;
  imageUrls: string[];
  freshnessScore: number;
  qrCode: string;
  createdAt: string;
  ngoDetails?: { name: string; contactNumber?: string; email?: string; address?: string; latitude?: number; longitude?: number };
  volunteerDetails?: { name: string; contactNumber?: string; email?: string };
  donorDetails?: { name: string; contactNumber?: string; email?: string };
}

// Convert DB row → app DonationItem
const mapRow = (row: any): DonationItem => ({
  id: row.id,
  foodType: row.food_type,
  quantity: row.quantity,
  unit: row.unit,
  bestBeforeDate: row.best_before_date ?? '',
  preparationTime: row.preparation_time ?? '',
  temperature: row.temperature ?? 25,
  donorId: row.donor_id ?? '',
  donorName: row.donor_name ?? '',
  ngoId: row.ngo_id ?? undefined,
  ngoName: row.ngo_name ?? undefined,
  volunteerId: row.volunteer_id ?? undefined,
  volunteerName: row.volunteer_name ?? undefined,
  status: row.status,
  pickupAddress: row.pickup_address ?? '',
  gpsLocation: { latitude: row.latitude ?? 28.6139, longitude: row.longitude ?? 77.209 },
  contactNumber: row.contact_number ?? '',
  additionalNotes: row.additional_notes ?? '',
  imageUrls: row.image_urls ?? [],
  freshnessScore: row.freshness_score ?? 80,
  qrCode: row.qr_code ?? '',
  createdAt: row.created_at,
});

export class DonationService {
  /**
   * Fetch all donations (admin/ngo) or by donor
   */
  static async getDonations(filters?: { donorId?: string; status?: string; ngoId?: string }) {
    let query = supabase.from('donations').select('*').order('created_at', { ascending: false });

    if (filters?.donorId) query = query.eq('donor_id', filters.donorId);
    if (filters?.ngoId) query = query.eq('ngo_id', filters.ngoId);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  /**
   * Get donations available for NGO browsing (Pending only)
   */
  static async getAvailableDonations() {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  /**
   * Create a new donation
   */
  static async createDonation(donationData: {
    foodType: string;
    quantity: number;
    unit: string;
    bestBeforeDate: string;
    preparationTime: string;
    temperature: number;
    donorId: string;
    donorName: string;
    pickupAddress: string;
    latitude?: number;
    longitude?: number;
    contactNumber: string;
    additionalNotes?: string;
    imageUrls?: string[];
    freshnessScore?: number;
  }) {
    const qrCode = `QR_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data, error } = await supabase
      .from('donations')
      .insert({
        food_type: donationData.foodType,
        quantity: donationData.quantity,
        unit: donationData.unit,
        best_before_date: donationData.bestBeforeDate,
        preparation_time: donationData.preparationTime,
        temperature: donationData.temperature,
        donor_id: donationData.donorId,
        donor_name: donationData.donorName,
        status: 'Pending',
        pickup_address: donationData.pickupAddress,
        latitude: donationData.latitude ?? null,
        longitude: donationData.longitude ?? null,
        contact_number: donationData.contactNumber,
        additional_notes: donationData.additionalNotes ?? '',
        image_urls: donationData.imageUrls ?? [],
        freshness_score: donationData.freshnessScore ?? 80,
        qr_code: qrCode,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const donation = mapRow(data);

    // Create notification for donor
    await NotificationService.createNotification({
      userId: donationData.donorId,
      title: 'Donation Listed! 🍎',
      message: `Your food offer for ${donationData.quantity} ${donationData.unit} of ${donationData.foodType} has been listed.`,
      type: 'donation_created',
      relatedDonationId: donation.id,
    }).catch(err => console.error('Failed to create donor notification:', err));

    // Create notification for all NGOs
    try {
      const { data: ngos } = await supabase.from('profiles').select('id').eq('role', 'ngo');
      if (ngos) {
        for (const ngo of ngos) {
          await NotificationService.createNotification({
            userId: ngo.id,
            title: 'New Donation Available!',
            message: `A fresh donation of ${donationData.quantity} ${donationData.unit} of ${donationData.foodType} is available for acceptance.`,
            type: 'new_donation',
            relatedDonationId: donation.id,
          }).catch(err => console.error(`Failed to notify NGO ${ngo.id}:`, err));
        }
      }
    } catch (err) {
      console.error('Failed to retrieve or notify NGOs:', err);
    }

    return donation;
  }

  /**
   * Update donation status
   */
  static async updateStatus(donationId: string, status: string, extraData?: {
    ngoId?: string; ngoName?: string;
    volunteerId?: string; volunteerName?: string;
  }) {
    const updatePayload: any = { status };
    if (extraData?.ngoId) { updatePayload.ngo_id = extraData.ngoId; updatePayload.ngo_name = extraData.ngoName; }
    if (extraData?.volunteerId) { updatePayload.volunteer_id = extraData.volunteerId; updatePayload.volunteer_name = extraData.volunteerName; }

    const { data, error } = await supabase
      .from('donations')
      .update(updatePayload)
      .eq('id', donationId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const updatedDonation = mapRow(data);

    if (status === 'Accepted' && extraData?.ngoId) {
      // Notification for Donor
      await NotificationService.createNotification({
        userId: updatedDonation.donorId,
        title: 'Donation Accepted!',
        message: `${extraData.ngoName || 'An NGO'} has accepted your donation of ${updatedDonation.quantity} ${updatedDonation.unit} of ${updatedDonation.foodType}.`,
        type: 'accepted',
        relatedDonationId: updatedDonation.id,
      }).catch(err => console.error('Failed to notify donor on acceptance:', err));

      // Notification for NGO
      await NotificationService.createNotification({
        userId: extraData.ngoId,
        title: 'Donation Accepted',
        message: `You accepted donation: ${updatedDonation.quantity} ${updatedDonation.unit} of ${updatedDonation.foodType}.`,
        type: 'accepted',
        relatedDonationId: updatedDonation.id,
      }).catch(err => console.error('Failed to notify NGO on acceptance:', err));
    }

    return updatedDonation;
  }

  /**
   * Get NGO's accepted/assigned donations
   */
  static async getNgoDonations(ngoId: string) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('ngo_id', ngoId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  /**
   * Get volunteer's assigned pickups
   */
  static async getVolunteerPickups(volunteerId: string) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  /**
   * Delete a donation
   */
  static async deleteDonation(donationId: string) {
    const { error } = await supabase.from('donations').delete().eq('id', donationId);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}

export default DonationService;
