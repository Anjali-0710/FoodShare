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
    console.log('[AdminService.getUsers] Executing Supabase query for profiles...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    console.log('[AdminService.getUsers] Query completed, error:', error);

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
    console.log('[AdminService.updateUser] Updating user id:', id);
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
    console.log('[AdminService.updateUser] Update finished, error:', error);

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
  static async toggleUserStatus(id: string, statusOrIsActive: 'active' | 'suspended' | boolean, token: string | null) {
    const status: 'active' | 'suspended' =
      typeof statusOrIsActive === 'boolean'
        ? (statusOrIsActive ? 'active' : 'suspended')
        : statusOrIsActive;
    const isActive = status === 'active';

    console.log('[AdminService.toggleUserStatus] Toggling status for id:', id, 'status:', status);

    // Try updating status & is_active together
    let { error } = await supabase
      .from('profiles')
      .update({
        status,
        is_active: isActive,
      })
      .eq('id', id);

    // Fallback if status column is missing in schema cache
    if (error && (error.message?.includes('status') || error.code === 'PGRST204')) {
      console.warn('[AdminService.toggleUserStatus] Status column missing in schema cache, falling back to is_active:', error.message);
      const fallback = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id);
      error = fallback.error;
    }

    console.log('[AdminService.toggleUserStatus] Toggle finished, error:', error);

    if (error) throw new Error(error.message);
    return {
      success: true,
      message: `User account ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      user: { id, status, isActive },
    };
  }

  /**
   * Delete user (admin).
   * Requires the "profiles_delete_admin" RLS policy to be applied.
   */
  static async deleteUser(id: string, token: string | null) {
    console.log('[AdminService.deleteUser] Deleting user id:', id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    console.log('[AdminService.deleteUser] Delete finished, error:', error);
    if (error) throw new Error(error.message);
    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * Get all donations (admin).
   */
  static async getDonations(token: string | null) {
    console.log('[AdminService.getDonations] Executing Supabase query for donations...');
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });
    console.log('[AdminService.getDonations] Query completed, error:', error);

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
    console.log('[AdminService.updateDonationStatus] Updating donation id:', id, 'status:', status);
    const { error } = await supabase
      .from('donations')
      .update({ status })
      .eq('id', id);
    console.log('[AdminService.updateDonationStatus] Update finished, error:', error);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Donation status updated' };
  }

  /**
   * Delete a donation (admin).
   */
  static async deleteDonation(id: string, token: string | null) {
    console.log('[AdminService.deleteDonation] Deleting donation id:', id);
    const { error } = await supabase.from('donations').delete().eq('id', id);
    console.log('[AdminService.deleteDonation] Delete finished, error:', error);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Donation deleted' };
  }

  /**
   * Get system logs.
   */
  static async getLogs(token: string | null) {
    console.log('[AdminService.getLogs] Executing Supabase query for system_logs...');
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    console.log('[AdminService.getLogs] Query completed, error:', error);

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
    console.log('[AdminService.getAnalytics] Executing Promise.all query for profiles and donations...');
    const [usersResult, donationsResult] = await Promise.all([
      supabase.from('profiles').select('role, created_at, is_active', { count: 'exact' }),
      supabase.from('donations').select('status, food_type, quantity, unit, created_at', { count: 'exact' }),
    ]);
    console.log('[AdminService.getAnalytics] Query completed, users error:', usersResult.error, 'donations error:', donationsResult.error);

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
    console.log('[AdminService.getReports] Calling getAnalytics...');
    return AdminService.getAnalytics(token);
  }
}

export default AdminService;
