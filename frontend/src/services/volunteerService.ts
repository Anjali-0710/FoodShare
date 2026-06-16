import { apiCall } from './api';

export class VolunteerService {
  static async getAvailablePickups(token: string | null) {
    return apiCall('/donations?status=Accepted', { token });
  }

  static async getAssignedPickups(token: string | null) {
    return apiCall('/volunteer/pickups', { token });
  }

  static async claimPickup(donationId: string, token: string | null) {
    return apiCall(`/donations/${donationId}/assign`, {
      method: 'PUT',
      token,
    });
  }

  static async updateStatus(donationId: string, status: 'Picked Up' | 'Delivered' | 'Cancelled', token: string | null) {
    return apiCall(`/donations/${donationId}/status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  }

  static async verifyQrCode(qrCode: string, token: string | null) {
    return apiCall('/donations/verify-qr', {
      method: 'POST',
      body: { qrCode },
      token,
    });
  }

  static async getLeaderboard(token: string | null) {
    return apiCall('/volunteer/leaderboard', { token });
  }
}

export default VolunteerService;
