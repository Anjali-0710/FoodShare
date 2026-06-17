import { supabase } from './supabase';

export class AuthService {
  /**
   * Register a new user with Supabase Auth + insert profile
   */
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    contactNumber: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    ngoCapacity?: number;
    foodTypePreference?: string[];
  }) {
    const { name, email, password, role, contactNumber, address, latitude, longitude, ngoCapacity, foodTypePreference } = userData;

    // Sign up with Supabase Auth (sends verification email automatically)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name,
          role,
          contact_number: contactNumber,
          address: address || '',
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Registration failed. Please try again.');
    }

    // Insert profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      email: email.trim().toLowerCase(),
      role: role as any,
      contact_number: contactNumber,
      address: address || '',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      ngo_capacity: role === 'ngo' ? (ngoCapacity ?? 100) : null,
      food_type_preference: (role === 'ngo' || role === 'volunteer') ? (foodTypePreference ?? []) : null,
      volunteer_score: 0,
      completed_pickups: 0,
      is_active: true,
    });

    if (profileError) {
      console.error('Profile insert error:', profileError);
      // Don't throw — auth account already created, profile can be fixed later
    }

    return {
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      email: authData.user.email,
      requiresVerification: !authData.session, // true if email verification required
    };
  }

  /**
   * Log in user with Supabase Auth
   */
  static async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return {
          success: false,
          message: 'Please verify your email address before logging in.',
          isVerified: false,
          email: email.trim().toLowerCase(),
        };
      }
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed. Please try again.');
    }

    // Fetch profile to get role and additional data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found. Please contact support.');
    }

    const userObj = {
      id: data.user.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as any,
      contactNumber: profile.contact_number ?? '',
      address: profile.address ?? '',
      gpsLocation: profile.latitude && profile.longitude
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : undefined,
      ngoCapacity: profile.ngo_capacity ?? undefined,
      foodTypePreference: profile.food_type_preference ?? [],
      volunteerScore: profile.volunteer_score ?? 0,
      completedPickups: profile.completed_pickups ?? 0,
    };

    return {
      success: true,
      message: 'Login successful',
      token: data.session.access_token,
      user: userObj,
    };
  }

  /**
   * Log out current user
   */
  static async logout() {
    await supabase.auth.signOut();
    return { success: true };
  }

  /**
   * Get current session & user profile
   */
  static async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) return null;

      return {
        token: session.access_token,
        user: {
          id: session.user.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as any,
          contactNumber: profile.contact_number ?? '',
          address: profile.address ?? '',
          gpsLocation: profile.latitude && profile.longitude
            ? { latitude: profile.latitude, longitude: profile.longitude }
            : undefined,
          ngoCapacity: profile.ngo_capacity ?? undefined,
          foodTypePreference: profile.food_type_preference ?? [],
          volunteerScore: profile.volunteer_score ?? 0,
          completedPickups: profile.completed_pickups ?? 0,
        },
      };
    } catch (err) {
      console.error('Error in AuthService.getSession:', err);
      return null;
    }
  }

  /**
   * Send password reset email via Supabase Auth
   */
  static async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'https://foodshare-platform.onrender.com/reset-password' }
    );

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    };
  }

  /**
   * Update password (after reset flow)
   */
  static async resetPassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Password updated successfully.' };
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Verification email resent. Please check your inbox.' };
  }

  /**
   * Update user profile (auto-detects user ID from current session)
   */
  static async updateProfile(data: {
    name?: string;
    contactNumber?: string;
    address?: string;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        name: data.name,
        contact_number: data.contactNumber,
        address: data.address,
      })
      .eq('id', session.user.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Profile updated successfully.' };
  }
}

export default AuthService;
