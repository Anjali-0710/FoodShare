import { apiCall } from './api';

export class AdminService {
  static async getUsers(token: string | null) {
    return apiCall('/admin/users', { token });
  }

  static async updateUser(
    id: string,
    userData: {
      name: string;
      email: string;
      role: string;
      contactNumber: string;
      address: string;
    },
    token: string | null
  ) {
    return apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: userData,
      token,
    });
  }

  static async toggleUserStatus(id: string, isActive: boolean, token: string | null) {
    return apiCall(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: { isActive },
      token,
    });
  }

  static async deleteUser(id: string, token: string | null) {
    return apiCall(`/admin/users/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  static async getDonations(token: string | null) {
    return apiCall('/admin/donations', { token });
  }

  static async updateDonationStatus(id: string, status: string, token: string | null) {
    return apiCall(`/admin/donations/${id}/status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  }

  static async deleteDonation(id: string, token: string | null) {
    return apiCall(`/admin/donations/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  static async getLogs(token: string | null) {
    return apiCall('/admin/logs', { token });
  }

  static async getAnalytics(token: string | null) {
    return apiCall('/admin/analytics', { token });
  }

  static async getReports(token: string | null) {
    return apiCall('/admin/reports', { token });
  }
}

export default AdminService;
