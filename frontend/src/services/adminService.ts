import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// All operations use the publishable (anon) Supabase key.
// Admin-specific writes (Activate/Deactivate/Edit/Delete) are permitted by the
// "profiles_update_admin" and "profiles_delete_admin" RLS policies defined in
// supabase/migrations/admin_rls_policy.sql — run that migration once in the
// Supabase Dashboard > SQL Editor to enable these operations.
// ─────────────────────────────────────────────────────────────────────────────

export class AdminService {
  /**
   * Get all users — SELECT policy allows all authenticated users.
   */
  static async getUsers(token: string | null) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return {
      success: true,
      users: (data ?? []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        contactNumber: u.contact_number ?? '',
        address: u.address ?? '',
        gpsLocation: u.latitude && u.longitude
          ? { latitude: u.latitude, longitude: u.longitude }
          : undefined,
        ngoCapacity: u.ngo_capacity ?? undefined,
        foodTypePreference: u.food_type_preference ?? [],
        volunteerScore: u.volunteer_score ?? 0,
        completedPickups: u.completed_pickups ?? 0,
        isActive: u.is_active,   // always the real DB value — never mocked
        createdAt: u.created_at,
      })),
    };
  }

  /**
   * Update user profile (admin).
   * Requires the "profiles_update_admin" RLS policy to be applied.
   */
  static async updateUser(id: string, userData: {
    name: string;
    email: string;
    role?: string;
    contactNumber?: string;
    address?: string;
  }, token: string | null) {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: userData.name,
        email: userData.email,
        role: userData.role as any,
        contact_number: userData.contactNumber,
        address: userData.address,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return {
      success: true,
      message: 'User updated successfully',
      user: { id, ...userData },
    };
  }

  /**
   * Toggle user active/inactive status (admin).
   * Requires the "profiles_update_admin" RLS policy to be applied.
   */
  static async toggleUserStatus(id: string, isActive: boolean, token: string | null) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return {
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: { id, isActive },
    };
  }

  /**
   * Delete user (admin).
   * Requires the "profiles_delete_admin" RLS policy to be applied.
   */
  static async deleteUser(id: string, token: string | null) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * Get all donations (admin).
   */
  static async getDonations(token: string | null) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return {
      success: true,
      donations: data ?? [],
    };
  }

  /**
   * Update donation status (admin).
   */
  static async updateDonationStatus(id: string, status: string, token: string | null) {
    const { error } = await supabase
      .from('donations')
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Donation status updated' };
  }

  /**
   * Delete a donation (admin).
   */
  static async deleteDonation(id: string, token: string | null) {
    const { error } = await supabase.from('donations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Donation deleted' };
  }

  /**
   * Get system logs.
   */
  static async getLogs(token: string | null) {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return {
      success: true,
      logs: (data ?? []).map(l => ({
        id: l.id,
        action: l.action ?? '',
        performedBy: l.performed_by ?? '',
        role: l.role ?? '',
        details: l.details ?? '',
        timestamp: l.created_at,
      })),
    };
  }

  /**
   * Get analytics data (real data from Supabase).
   */
  static async getAnalytics(token: string | null) {
    const [usersResult, donationsResult] = await Promise.all([
      supabase.from('profiles').select('role, created_at, is_active', { count: 'exact' }),
      supabase.from('donations').select('status, food_type, quantity, unit, created_at', { count: 'exact' }),
    ]);

    const users = usersResult.data ?? [];
    const donations = donationsResult.data ?? [];

    const totalDonations = donations.length;
    const completedDonations = donations.filter(d =>
      d.status === 'Completed' || d.status === 'Delivered'
    ).length;
    const activeDonations = donations.filter(d =>
      ['Pending', 'Accepted', 'Assigned', 'Picked Up'].includes(d.status)
    ).length;
    const cancelledDonations = donations.filter(d => d.status === 'Cancelled').length;

    const foodSavedKg = donations
      .filter(d => d.status === 'Completed' || d.status === 'Delivered')
      .reduce((sum, d) => {
        if (d.unit === 'Kg') return sum + (d.quantity ?? 0);
        if (d.unit === 'Plates') return sum + (d.quantity ?? 0) * 0.3;
        if (d.unit === 'Packets') return sum + (d.quantity ?? 0) * 0.5;
        return sum + (d.quantity ?? 0);
      }, 0);

    const totalDonors = users.filter(u => u.role === 'donor').length;
    const totalNgos = users.filter(u => u.role === 'ngo').length;
    const totalVolunteers = users.filter(u => u.role === 'volunteer').length;
    const activeUsers = users.filter(u => u.is_active !== false).length;

    const foodTypeBreakdown = donations.reduce((acc: any, d) => {
      if (d.food_type) acc[d.food_type] = (acc[d.food_type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      analytics: {
        totalUsers: users.length,
        activeUsers,
        totalDonations,
        completedDonations,
        activeDonations,
        cancelledDonations,
        foodSavedKg: Math.round(foodSavedKg * 10) / 10,
        totalBeneficiaries: completedDonations * 12,
        totalDonors,
        totalNgos,
        totalVolunteers,
        foodTypeBreakdown,
        completionRate: totalDonations > 0
          ? Math.round((completedDonations / totalDonations) * 100)
          : 0,
      },
    };
  }

  /**
   * Get reports.
   */
  static async getReports(token: string | null) {
    return AdminService.getAnalytics(token);
  }
}

export default AdminService;
