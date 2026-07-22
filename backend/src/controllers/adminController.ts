import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { SystemLog } from '../models/Report';
import { getDbStatus } from '../config/db';
import { mockUsers, mockDonations, mockSystemLogs } from '../config/mockDb';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ocsgzbmnnldpcsbfgocz.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);


const getKgEquivalent = (quantity: number, unit: string): number => {
  switch (unit) {
    case 'Kg': return quantity;
    case 'Liters': return quantity;
    case 'Plates': return quantity * 0.4;
    case 'Packets': return quantity * 0.3;
    default: return quantity;
  }
};

// GET /api/admin/users
export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let usersList: any[] = [];

    if (isDb) {
      usersList = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    } else {
      usersList = mockUsers.map(({ passwordHash, ...rest }) => rest);
    }

    return res.status(200).json({ success: true, users: usersList });
  } catch (error: any) {
    console.error('Admin getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving users' });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, contactNumber, address } = req.body;
  try {
    const isDb = getDbStatus();
    let updatedUser: any = null;

    if (isDb) {
      updatedUser = await User.findByIdAndUpdate(
        id,
        { name, email, role, contactNumber, address },
        { new: true }
      ).select('-passwordHash');

      if (updatedUser) {
        await SystemLog.create({
          action: 'User Record Edited',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Updated info for user ID: ${id} (${name})`
        });
      }
    } else {
      const idx = mockUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], name, email, role, contactNumber, address };
        const { passwordHash, ...rest } = mockUsers[idx];
        updatedUser = rest;

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'User Record Edited',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Updated info for user ID: ${id} (${name})`,
          timestamp: new Date()
        });
      }
    }

    // Sync to Supabase using service role bypass
    try {
      // 1. Update profiles table
      const { error: sbProfileErr } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          role: role as any,
          contact_number: contactNumber,
          address
        })
        .eq('id', id);

      if (sbProfileErr) {
        console.error('Supabase profile update error:', sbProfileErr.message);
      }

      // 2. Update Supabase Auth user record (auth.users)
      const { error: sbAuthErr } = await supabase.auth.admin.updateUserById(id, {
        email,
        user_metadata: { name, role, contact_number: contactNumber, address }
      });
      if (sbAuthErr) {
        console.error('Supabase Auth update error:', sbAuthErr.message);
      }
    } catch (sbErr: any) {
      console.error('Supabase update synchronization failed:', sbErr.message);
    }

    // If both databases return null / mock not found, return 404
    if (!updatedUser) {
      // Fallback: see if we can get user info from profiles
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profile) {
        updatedUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          contactNumber: profile.contact_number,
          address: profile.address,
          isActive: profile.is_active
        };
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Admin updateUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

// PUT /api/admin/users/:id/status
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const isDb = getDbStatus();
    let updatedUser: any = null;

    if (isDb) {
      updatedUser = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).select('-passwordHash');

      if (updatedUser) {
        await SystemLog.create({
          action: `User Account ${isActive ? 'Activated' : 'Deactivated'}`,
          performedBy: req.user!.email,
          role: 'admin',
          details: `${isActive ? 'Activated' : 'Deactivated'} login credentials for user ID: ${id}`
        });
      }
    } else {
      const idx = mockUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
        mockUsers[idx].isActive = isActive;
        const { passwordHash, ...rest } = mockUsers[idx];
        updatedUser = rest;

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: `User Account ${isActive ? 'Activated' : 'Deactivated'}`,
          performedBy: req.user!.email,
          role: 'admin',
          details: `${isActive ? 'Activated' : 'Deactivated'} login credentials for user ID: ${id}`,
          timestamp: new Date()
        });
      }
    }

    // Sync status update to Supabase using service role bypass
    try {
      const { error: sbProfileErr } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (sbProfileErr) {
        console.error('Supabase profile active status sync error:', sbProfileErr.message);
      }
      
      const { error: sbAuthErr } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: { is_active: isActive }
      });
      if (sbAuthErr) {
        console.error('Supabase Auth active status metadata sync error:', sbAuthErr.message);
      }
    } catch (sbErr: any) {
      console.error('Supabase toggle status sync failed:', sbErr.message);
    }

    // Fallback: see if we can get user info from profiles
    if (!updatedUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profile) {
        updatedUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          contactNumber: profile.contact_number,
          address: profile.address,
          isActive: profile.is_active
        };
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`, user: updatedUser });
  } catch (error: any) {
    console.error('Admin toggleUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling user status' });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const isDb = getDbStatus();
    let deleted = false;

    if (isDb) {
      const result = await User.findByIdAndDelete(id);
      if (result) {
        deleted = true;
        await SystemLog.create({
          action: 'User Account Deleted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Deleted user ID: ${id} (${result.name})`
        });
      }
    } else {
      const idx = mockUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
        const deletedUser = mockUsers[idx];
        mockUsers.splice(idx, 1);
        deleted = true;

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'User Account Deleted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Deleted user ID: ${id} (${deletedUser.name})`,
          timestamp: new Date()
        });
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Admin deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};

// GET /api/admin/donations
export const getDonationsAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let donations: any[] = [];

    if (isDb) {
      donations = await Donation.find().populate('donorId ngoId volunteerId', 'name email contactNumber').sort({ createdAt: -1 });
    } else {
      donations = mockDonations.map(d => {
        const donor = mockUsers.find(u => u.id === d.donorId);
        const ngo = mockUsers.find(u => u.id === d.ngoId);
        const volunteer = mockUsers.find(u => u.id === d.volunteerId);
        return {
          ...d,
          donorDetails: donor ? { name: donor.name, email: donor.email, contactNumber: donor.contactNumber } : null,
          ngoDetails: ngo ? { name: ngo.name, email: ngo.email, contactNumber: ngo.contactNumber } : null,
          volunteerDetails: volunteer ? { name: volunteer.name, email: volunteer.email, contactNumber: volunteer.contactNumber } : null
        };
      });
      donations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return res.status(200).json({ success: true, donations });
  } catch (error: any) {
    console.error('Admin getDonations error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving donations' });
  }
};

// PUT /api/admin/donations/:id/status
export const updateDonationStatusAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const isDb = getDbStatus();
    let updatedDonation: any = null;

    if (isDb) {
      updatedDonation = await Donation.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate('donorId ngoId volunteerId', 'name email contactNumber');

      if (updatedDonation) {
        await SystemLog.create({
          action: 'Donation Status Adjusted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Admin changed status of donation ${id} to "${status}"`
        });
      }
    } else {
      const idx = mockDonations.findIndex(d => d.id === id);
      if (idx !== -1) {
        mockDonations[idx].status = status;
        const d = mockDonations[idx];
        const donor = mockUsers.find(u => u.id === d.donorId);
        const ngo = mockUsers.find(u => u.id === d.ngoId);
        const volunteer = mockUsers.find(u => u.id === d.volunteerId);
        updatedDonation = {
          ...d,
          donorDetails: donor ? { name: donor.name, email: donor.email, contactNumber: donor.contactNumber } : null,
          ngoDetails: ngo ? { name: ngo.name, email: ngo.email, contactNumber: ngo.contactNumber } : null,
          volunteerDetails: volunteer ? { name: volunteer.name, email: volunteer.email, contactNumber: volunteer.contactNumber } : null
        };

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'Donation Status Adjusted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Admin changed status of donation ${id} to "${status}"`,
          timestamp: new Date()
        });
      }
    }

    if (!updatedDonation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    return res.status(200).json({ success: true, message: 'Donation status updated successfully', donation: updatedDonation });
  } catch (error: any) {
    console.error('Admin updateDonationStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating donation status' });
  }
};

// DELETE /api/admin/donations/:id
export const deleteDonationAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const isDb = getDbStatus();
    let deleted = false;

    if (isDb) {
      const result = await Donation.findByIdAndDelete(id);
      if (result) {
        deleted = true;
        await SystemLog.create({
          action: 'Donation Post Deleted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Admin deleted donation listing ID: ${id}`
        });
      }
    } else {
      const idx = mockDonations.findIndex(d => d.id === id);
      if (idx !== -1) {
        mockDonations.splice(idx, 1);
        deleted = true;

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'Donation Post Deleted',
          performedBy: req.user!.email,
          role: 'admin',
          details: `Admin deleted donation listing ID: ${id}`,
          timestamp: new Date()
        });
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    return res.status(200).json({ success: true, message: 'Donation deleted successfully' });
  } catch (error: any) {
    console.error('Admin deleteDonation error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting donation' });
  }
};

// GET /api/admin/system-logs
export const getSystemActivities = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let logsList: any[] = [];

    if (isDb) {
      logsList = await SystemLog.find().sort({ timestamp: -1 }).limit(100);
    } else {
      logsList = mockSystemLogs;
    }

    return res.status(200).json({ success: true, logs: logsList });
  } catch (error: any) {
    console.error('Admin system activities error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving logs' });
  }
};

// GET /api/admin/analytics
export const getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let donationsList: any[] = [];
    let usersList: any[] = [];

    if (isDb) {
      donationsList = await Donation.find();
      usersList = await User.find().select('role');
    } else {
      donationsList = mockDonations;
      usersList = mockUsers;
    }

    const totalDonations = donationsList.length;
    const completedDonations = donationsList.filter(d => d.status === 'Completed').length;
    const activeDonations = donationsList.filter(d => ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)).length;
    const cancelledDonations = donationsList.filter(d => d.status === 'Cancelled').length;

    // Users roles totals
    const totalDonors = usersList.filter(u => u.role === 'donor').length;
    const totalNgos = usersList.filter(u => u.role === 'ngo').length;
    const totalVolunteers = usersList.filter(u => u.role === 'volunteer').length;
    
    // Total Food waste saved (Kg)
    const foodSavedKg = donationsList
      .filter(d => d.status === 'Completed')
      .reduce((sum, d) => sum + getKgEquivalent(d.quantity, d.unit), 0);
    
    const totalBeneficiaries = completedDonations * 15; // Assume ~15 beneficiaries fed per average donation

    // Active Users count
    const activeUsers = usersList.length;

    // Categories breakdown
    const categoryBreakdown: Record<string, number> = {
      'Cooked Food': 0,
      'Vegetables': 0,
      'Fruits': 0,
      'Bakery Items': 0,
      'Beverages': 0,
      'Grocery Items': 0
    };
    donationsList.forEach(d => {
      if (categoryBreakdown[d.foodType] !== undefined) {
        categoryBreakdown[d.foodType]++;
      }
    });

    const categoryChart = Object.keys(categoryBreakdown).map(key => ({
      category: key,
      count: categoryBreakdown[key]
    }));

    // NGO Performance: Donations completed per NGO
    const ngoCompletions: Record<string, number> = {};
    donationsList.filter(d => d.status === 'Completed' && d.ngoName).forEach(d => {
      ngoCompletions[d.ngoName!] = (ngoCompletions[d.ngoName!] || 0) + 1;
    });

    const ngoPerformanceChart = Object.keys(ngoCompletions).map(key => ({
      ngo: key,
      completedCount: ngoCompletions[key]
    }));

    // Monthly trends (group by YYYY-MM)
    const monthlyTrends: Record<string, number> = {};
    donationsList.forEach(d => {
      const date = new Date(d.createdAt);
      const key = date.toLocaleString('default', { month: 'short' });
      monthlyTrends[key] = (monthlyTrends[key] || 0) + 1;
    });

    // Make sure we have at least the last three months sorted
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();
    const last3Months = [
      monthsOrder[(currentMonthIndex - 2 + 12) % 12],
      monthsOrder[(currentMonthIndex - 1 + 12) % 12],
      monthsOrder[currentMonthIndex]
    ];

    const monthlyTrendsChart = last3Months.map(m => ({
      month: m,
      count: monthlyTrends[m] || 0
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalDonations,
        completedDonations,
        activeDonations,
        cancelledDonations,
        totalDonors,
        totalNgos,
        totalVolunteers,
        foodSavedKg: Math.round(foodSavedKg * 10) / 10,
        totalBeneficiaries,
        activeUsers
      },
      charts: {
        categories: categoryChart,
        ngoPerformance: ngoPerformanceChart,
        monthlyTrends: monthlyTrendsChart
      }
    });

  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error compiling dashboard analytics' });
  }
};

// GET /api/admin/reports
export const getReportsAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let donations: any[] = [];
    let users: any[] = [];

    if (isDb) {
      donations = await Donation.find().populate('donorId ngoId volunteerId', 'name email contactNumber');
      users = await User.find().select('-passwordHash');
    } else {
      donations = mockDonations.map(d => {
        const donor = mockUsers.find(u => u.id === d.donorId);
        const ngo = mockUsers.find(u => u.id === d.ngoId);
        const volunteer = mockUsers.find(u => u.id === d.volunteerId);
        return {
          ...d,
          donorDetails: donor ? { name: donor.name, email: donor.email } : null,
          ngoDetails: ngo ? { name: ngo.name, email: ngo.email } : null,
          volunteerDetails: volunteer ? { name: volunteer.name, email: volunteer.email } : null
        };
      });
      users = mockUsers.map(({ passwordHash, ...rest }) => rest);
    }

    // Donation Report
    const donationReport = donations.map(d => ({
      date: new Date(d.createdAt).toLocaleDateString(),
      time: new Date(d.createdAt).toLocaleTimeString(),
      foodType: d.foodType,
      quantity: `${d.quantity} ${d.unit}`,
      donorName: d.donorDetails?.name || d.donorName || 'N/A',
      ngoName: d.ngoDetails?.name || d.ngoName || 'N/A',
      volunteerName: d.volunteerDetails?.name || d.volunteerName || 'N/A',
      status: d.status
    }));

    // User Report
    const userReport = users.map(u => ({
      date: new Date(u.createdAt || Date.now()).toLocaleDateString(),
      name: u.name,
      email: u.email,
      role: u.role.toUpperCase(),
      contact: u.contactNumber,
      status: u.isActive !== false ? 'Active' : 'Inactive'
    }));

    // NGO Report
    const ngoReport = users.filter(u => u.role === 'ngo').map(u => {
      const completedCount = donations.filter(d => d.status === 'Completed' && (d.ngoId?.toString() === u._id?.toString() || d.ngoId === u.id || d.ngoName === u.name)).length;
      return {
        ngoName: u.name,
        email: u.email,
        contact: u.contactNumber,
        completedDeliveries: completedCount,
        capacity: u.ngoCapacity || 100,
        status: u.isActive !== false ? 'Active' : 'Inactive'
      };
    });

    // Volunteer Report
    const volunteerReport = users.filter(u => u.role === 'volunteer').map(u => {
      const completedCount = donations.filter(d => d.status === 'Completed' && (d.volunteerId?.toString() === u._id?.toString() || d.volunteerId === u.id || d.volunteerName === u.name)).length;
      return {
        volunteerName: u.name,
        email: u.email,
        contact: u.contactNumber,
        score: u.volunteerScore || 0,
        completedDeliveries: completedCount,
        status: u.isActive !== false ? 'Active' : 'Inactive'
      };
    });

    return res.status(200).json({
      success: true,
      reports: {
        donations: donationReport,
        users: userReport,
        ngos: ngoReport,
        volunteers: volunteerReport
      }
    });
  } catch (error: any) {
    console.error('Admin getReports error:', error);
    return res.status(500).json({ success: false, message: 'Server error compiling system reports data' });
  }
};
