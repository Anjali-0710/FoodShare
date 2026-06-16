import { apiCall } from './api';

export class AuthService {
  /**
   * Log in user with credentials
   */
  static async login(email: string, password: string) {
    return apiCall('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password }
    });
  }

  /**
   * Register a new user with system parameters
   */
  static async register(userData: {
    name: string;
    email: string;
    password?: string;
    role: string;
    contactNumber: string;
    address: string;
    latitude?: number;
    longitude?: number;
    ngoCapacity?: number;
    foodTypePreference?: string[];
  }) {
    return apiCall('/auth/register', {
      method: 'POST',
      body: userData
    });
  }

  /**
   * Initiate password recovery, generating verification code
   */
  static async forgotPassword(email: string) {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.trim().toLowerCase() }
    });
  }

  /**
   * Submit reset password verification code and update password
   */
  static async resetPassword(email: string, code: string, newPassword: string) {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), code, newPassword }
    });
  }
}

export default AuthService;
