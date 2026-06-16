import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { getDbStatus } from '../config/db';
import { mockUsers, mockDonations } from '../config/mockDb';

// GET /api/volunteer/pickups
export const getAssignedPickups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    const volunteerId = req.user!.id;
    let activePickups: any[] = [];

    if (isDb) {
      activePickups = await Donation.find({
        volunteerId,
        status: { $in: ['Assigned', 'Picked Up', 'Delivered'] }
      }).populate('donorId ngoId', 'name contactNumber address gpsLocation');
    } else {
      activePickups = mockDonations.filter(
        d => d.volunteerId === volunteerId && ['Assigned', 'Picked Up', 'Delivered'].includes(d.status)
      );

      // Hydrate with mock user details
      activePickups = activePickups.map(d => {
        const donor = mockUsers.find(u => u.id === d.donorId);
        const ngo = mockUsers.find(u => u.id === d.ngoId);
        return {
          ...d,
          donorDetails: donor ? { name: donor.name, contactNumber: donor.contactNumber, address: donor.address, gpsLocation: donor.gpsLocation } : null,
          ngoDetails: ngo ? { name: ngo.name, contactNumber: ngo.contactNumber, address: ngo.address, gpsLocation: ngo.gpsLocation } : null
        };
      });
    }

    return res.status(200).json({ success: true, pickups: activePickups });
  } catch (error: any) {
    console.error('Get assigned pickups error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving assigned pickups' });
  }
};

// GET /api/volunteer/leaderboard
export const getLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let leaderboard: any[] = [];

    if (isDb) {
      leaderboard = await User.find({ role: 'volunteer' })
        .select('name volunteerScore completedPickups')
        .sort({ volunteerScore: -1 })
        .limit(10);
    } else {
      leaderboard = mockUsers
        .filter(u => u.role === 'volunteer')
        .map(u => ({
          id: u.id,
          name: u.name,
          volunteerScore: u.volunteerScore,
          completedPickups: u.completedPickups
        }))
        .sort((a, b) => b.volunteerScore - a.volunteerScore)
        .slice(0, 10);
    }

    return res.status(200).json({ success: true, leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving leaderboard stats' });
  }
};
