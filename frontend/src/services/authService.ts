import { supabase } from './supabase';

export class AuthService {
  /**
   * Register a new user with Supabase Auth + insert profile.
   * No email verification required — user is logged in immediately after signup.
   */
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: string;  // donor | ngo | volunteer | admin
    contactNumber: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    ngoCapacity?: number;
    foodTypePreference?: string[];
  }) {
    const { name, email, password, role, contactNumber, address, latitude, longitude, ngoCapacity, foodTypePreference } = userData;

    // Sign up with Supabase Auth
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

    // If no session was established (e.g. because Auth server configuration expects confirmation,
    // but our DB trigger auto-confirmed the user), sign in explicitly to establish session and headers.
    if (!authData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        throw new Error(`Auth sign up succeeded, but profile initialization login failed: ${signInError.message}`);
      }
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
      // Log it but don't throw — the database trigger (handle_new_user) 
      // already auto-created the profile. The insert here is a safety net.
      console.warn('Profile insert skipped (likely already created by trigger):', profileError.message);
    }

    return {
      success: true,
      message: 'Registration successful!',
      email: authData.user.email,
    };
  }

  /**
   * Log in user with Supabase Auth — direct login, no verification gate.
   */
  static async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed. Please try again.');
    }

    // Retry profile fetch up to 4 times — the DB trigger may take a moment after signup
    let profile: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (profileData) {
        profile = profileData;
        break;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    if (!profile) {
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

      // Reject anonymous users explicitly
      if (session.user?.is_anonymous) {
        await supabase.auth.signOut();
        return null;
      }

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
