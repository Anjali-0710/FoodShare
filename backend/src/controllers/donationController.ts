import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Donation } from '../models/Donation';
import { User } from '../models/User';
import { SystemLog } from '../models/Report';
import { getDbStatus } from '../config/db';
import { mockDonations, mockUsers, mockSystemLogs, MockDonation } from '../config/mockDb';
import { predictFreshness } from '../services/aiService';

// Generate QR Code helper
const generateQrCode = () => {
  return `QR_DON_${Math.floor(1000 + Math.random() * 9000)}`;
};

export const createDonation = async (req: AuthenticatedRequest, res: Response) => {
  const {
    foodType,
    quantity,
    unit,
    bestBeforeDate,
    preparationTime,
    temperature,
    pickupAddress,
    latitude,
    longitude,
    contactNumber,
    additionalNotes,
    imageUrls
  } = req.body;

  if (!foodType || !quantity || !unit || !bestBeforeDate || !pickupAddress || !latitude || !longitude || !contactNumber) {
    return res.status(400).json({ success: false, message: 'Please provide all mandatory fields' });
  }

  try {
    const isDb = getDbStatus();
    const donorId = req.user!.id;
    const donorName = req.user!.name;
    const prepTime = preparationTime ? new Date(preparationTime) : new Date();
    const expiryDate = new Date(bestBeforeDate);
    const temp = temperature ? Number(temperature) : 25;

    // AI Prediction: Usability/Freshness Score
    const freshnessScore = predictFreshness({
      foodType,
      preparationTime: prepTime,
      bestBeforeDate: expiryDate,
      temperature: temp
    });

    const qrCode = generateQrCode();

    let newDonation: any;

    if (isDb) {
      const dbDonation = await Donation.create({
        foodType,
        quantity: Number(quantity),
        unit,
        bestBeforeDate: expiryDate,
        preparationTime: prepTime,
        temperature: temp,
        donorId,
        status: 'Pending',
        pickupAddress,
        gpsLocation: { latitude: Number(latitude), longitude: Number(longitude) },
        contactNumber,
        additionalNotes,
        imageUrls: imageUrls || [],
        freshnessScore,
        qrCode
      });
      newDonation = dbDonation;

      // Audit system log
      await SystemLog.create({
        action: 'Donation Created',
        performedBy: req.user!.email,
        role: req.user!.role,
        details: `Created food donation ${foodType} (${quantity} ${unit}) with freshness score: ${freshnessScore}%`
      });
    } else {
      const mockId = `don_${Date.now()}`;
      const mockDonObj: MockDonation = {
        id: mockId,
        foodType,
        quantity: Number(quantity),
        unit,
        bestBeforeDate: expiryDate,
        preparationTime: prepTime,
        temperature: temp,
        donorId,
        donorName,
        status: 'Pending',
        pickupAddress,
        gpsLocation: { latitude: Number(latitude), longitude: Number(longitude) },
        contactNumber,
        additionalNotes: additionalNotes || '',
        imageUrls: imageUrls || ['https://images.unsplash.com/photo-1498837167922-ddd27525d352'], // default food img placeholder
        freshnessScore,
        qrCode,
        createdAt: new Date()
      };
      mockDonations.unshift(mockDonObj);
      newDonation = mockDonObj;

      mockSystemLogs.unshift({
        id: `log_${Date.now()}`,
        action: 'Donation Created',
        performedBy: req.user!.email,
        role: req.user!.role,
        details: `Created food donation ${foodType} (${quantity} ${unit}) with freshness score: ${freshnessScore}%`,
        timestamp: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Donation posted successfully',
      donation: newDonation
    });

  } catch (error: any) {
    console.error('Create donation error:', error);
    return res.status(500).json({ success: false, message: 'Server error listing donation', error: error.message });
  }
};

export const getDonations = async (req: AuthenticatedRequest, res: Response) => {
  const { status, foodType, mine } = req.query;

  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let donations: any[] = [];

    if (isDb) {
      let query: any = {};

      if (status) query.status = status;
      if (foodType) query.foodType = foodType;
      
      if (mine === 'true') {
        if (userRole === 'donor') query.donorId = userId;
        else if (userRole === 'ngo') query.ngoId = userId;
        else if (userRole === 'volunteer') query.volunteerId = userId;
      }

      donations = await Donation.find(query).populate('donorId ngoId volunteerId', 'name contactNumber').sort({ createdAt: -1 });
    } else {
      donations = [...mockDonations];

      if (status) {
        donations = donations.filter(d => d.status === status);
      }
      if (foodType) {
        donations = donations.filter(d => d.foodType === foodType);
      }
      if (mine === 'true') {
        if (userRole === 'donor') {
          donations = donations.filter(d => d.donorId === userId);
        } else if (userRole === 'ngo') {
          donations = donations.filter(d => d.ngoId === userId);
        } else if (userRole === 'volunteer') {
          donations = donations.filter(d => d.volunteerId === userId);
        }
      }
    }

    return res.status(200).json({ success: true, donations });
  } catch (error: any) {
    console.error('Get donations error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving donations' });
  }
};

export const getDonationById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const isDb = getDbStatus();
    let donation: any = null;

    if (isDb) {
      donation = await Donation.findById(id).populate('donorId ngoId volunteerId', 'name contactNumber email gpsLocation');
    } else {
      donation = mockDonations.find(d => d.id === id);
      if (donation) {
        // Hydrate details for response
        const donor = mockUsers.find(u => u.id === donation.donorId);
        const ngo = mockUsers.find(u => u.id === donation.ngoId);
        const volunteer = mockUsers.find(u => u.id === donation.volunteerId);

        donation = {
          ...donation,
          donorDetails: donor ? { name: donor.name, contactNumber: donor.contactNumber, email: donor.email } : null,
          ngoDetails: ngo ? { name: ngo.name, contactNumber: ngo.contactNumber, email: ngo.email } : null,
          volunteerDetails: volunteer ? { name: volunteer.name, contactNumber: volunteer.contactNumber, email: volunteer.email } : null
        };
      }
    }

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    return res.status(200).json({ success: true, donation });
  } catch (error: any) {
    console.error('Get donation details error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving donation details' });
  }
};

export const acceptDonation = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const ngoId = req.user!.id;
  const ngoName = req.user!.name;

  try {
    const isDb = getDbStatus();
    let updatedDonation: any = null;

    if (isDb) {
      updatedDonation = await Donation.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        { status: 'Accepted', ngoId },
        { new: true }
      );

      if (updatedDonation) {
        await SystemLog.create({
          action: 'Donation Accepted',
          performedBy: req.user!.email,
          role: 'ngo',
          details: `NGO accepted donation: ${id}`
        });
      }
    } else {
      const donationIndex = mockDonations.findIndex(d => d.id === id && d.status === 'Pending');
      if (donationIndex !== -1) {
        mockDonations[donationIndex].status = 'Accepted';
        mockDonations[donationIndex].ngoId = ngoId;
        mockDonations[donationIndex].ngoName = ngoName;
        updatedDonation = mockDonations[donationIndex];

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'Donation Accepted',
          performedBy: req.user!.email,
          role: 'ngo',
          details: `NGO accepted donation: ${id}`,
          timestamp: new Date()
        });
      }
    }

    if (!updatedDonation) {
      return res.status(400).json({ success: false, message: 'Donation could not be accepted or is already claimed' });
    }

    return res.status(200).json({ success: true, message: 'Donation accepted by NGO successfully.', donation: updatedDonation });
  } catch (error: any) {
    console.error('Accept donation error:', error);
    return res.status(500).json({ success: false, message: 'Server error accepting donation' });
  }
};

export const assignVolunteer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const volunteerId = req.user!.id;
  const volunteerName = req.user!.name;

  try {
    const isDb = getDbStatus();
    let updatedDonation: any = null;

    if (isDb) {
      updatedDonation = await Donation.findOneAndUpdate(
        { _id: id, status: 'Accepted' },
        { status: 'Assigned', volunteerId },
        { new: true }
      );

      if (updatedDonation) {
        await SystemLog.create({
          action: 'Volunteer Assigned',
          performedBy: req.user!.email,
          role: 'volunteer',
          details: `Volunteer claimed pickup for donation: ${id}`
        });
      }
    } else {
      const donationIndex = mockDonations.findIndex(d => d.id === id && d.status === 'Accepted');
      if (donationIndex !== -1) {
        mockDonations[donationIndex].status = 'Assigned';
        mockDonations[donationIndex].volunteerId = volunteerId;
        mockDonations[donationIndex].volunteerName = volunteerName;
        updatedDonation = mockDonations[donationIndex];

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'Volunteer Assigned',
          performedBy: req.user!.email,
          role: 'volunteer',
          details: `Volunteer claimed pickup for donation: ${id}`,
          timestamp: new Date()
        });
      }
    }

    if (!updatedDonation) {
      return res.status(400).json({ success: false, message: 'Donation could not be assigned (must be in Accepted status)' });
    }

    return res.status(200).json({ success: true, message: 'Volunteer assigned successfully', donation: updatedDonation });
  } catch (error: any) {
    console.error('Assign volunteer error:', error);
    return res.status(500).json({ success: false, message: 'Server error claiming volunteer delivery' });
  }
};

export const updateStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'Picked Up' or 'Delivered' or 'Cancelled'

  if (!status || !['Picked Up', 'Delivered', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update code' });
  }

  try {
    const isDb = getDbStatus();
    let updatedDonation: any = null;

    if (status === 'Cancelled' && req.user!.role === 'donor') {
      if (isDb) {
        // Find if donation exists, belongs to donor, and is Pending
        const existing = await Donation.findOne({ _id: id, donorId: req.user!.id });
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Donation not found or not owned by you' });
        }
        if (existing.status !== 'Pending') {
          return res.status(400).json({ success: false, message: 'Only Pending donations can be cancelled' });
        }
        existing.status = 'Cancelled';
        updatedDonation = await existing.save();
      } else {
        const donationIndex = mockDonations.findIndex(d => d.id === id && d.donorId === req.user!.id);
        if (donationIndex === -1) {
          return res.status(404).json({ success: false, message: 'Donation not found or not owned by you' });
        }
        if (mockDonations[donationIndex].status !== 'Pending') {
          return res.status(400).json({ success: false, message: 'Only Pending donations can be cancelled' });
        }
        mockDonations[donationIndex].status = 'Cancelled';
        updatedDonation = mockDonations[donationIndex];
      }
    } else {
      if (isDb) {
        updatedDonation = await Donation.findOneAndUpdate(
          { _id: id, volunteerId: req.user!.id },
          { status },
          { new: true }
        );
      } else {
        const donationIndex = mockDonations.findIndex(d => d.id === id && d.volunteerId === req.user!.id);
        if (donationIndex !== -1) {
          mockDonations[donationIndex].status = status;
          updatedDonation = mockDonations[donationIndex];
        }
      }
    }

    if (!updatedDonation) {
      return res.status(400).json({ success: false, message: 'Unable to update. You must be the assigned volunteer.' });
    }

    // Log progress status update
    if (isDb) {
      await SystemLog.create({
        action: `Donation Status Update`,
        performedBy: req.user!.email,
        role: req.user!.role,
        details: `Donation ${id} status set to ${status}`
      });
    } else {
      mockSystemLogs.unshift({
        id: `log_${Date.now()}`,
        action: `Donation Status Update`,
        performedBy: req.user!.email,
        role: req.user!.role,
        details: `Donation ${id} status set to ${status}`,
        timestamp: new Date()
      });
    }

    return res.status(200).json({ success: true, message: `Status updated to ${status}`, donation: updatedDonation });
  } catch (error: any) {
    console.error('Update status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating donation status' });
  }
};

// QR Verification code matching to transition Assigned/Picked Up -> Completed
export const verifyQR = async (req: AuthenticatedRequest, res: Response) => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return res.status(400).json({ success: false, message: 'Please provide QR code verification token' });
  }

  try {
    const isDb = getDbStatus();
    let donation: any = null;

    if (isDb) {
      // Find donation matching QR code
      donation = await Donation.findOne({ qrCode });
      if (donation) {
        if (donation.status === 'Completed') {
          return res.status(400).json({ success: false, message: 'Donation already marked completed' });
        }

        donation.status = 'Completed';
        await donation.save();

        // Reward the volunteer who completed it
        if (donation.volunteerId) {
          await User.findByIdAndUpdate(donation.volunteerId, {
            $inc: { volunteerScore: 50, completedPickups: 1 }
          });
        }

        await SystemLog.create({
          action: 'QR Verification Success',
          performedBy: req.user!.email,
          role: req.user!.role,
          details: `Successfully verified QR and marked donation ${donation._id} as completed`
        });
      }
    } else {
      const dIndex = mockDonations.findIndex(d => d.qrCode === qrCode);
      if (dIndex !== -1) {
        donation = mockDonations[dIndex];
        if (donation.status === 'Completed') {
          return res.status(400).json({ success: false, message: 'Donation already marked completed' });
        }

        mockDonations[dIndex].status = 'Completed';

        mockSystemLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'QR Verification Success',
          performedBy: req.user!.email,
          role: req.user!.role,
          details: `Successfully verified QR and marked donation ${donation.id} as completed`,
          timestamp: new Date()
        });
      }
    }

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Invalid QR code. Verification failed.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Donation QR verified successfully! Delivery finalized. +50 Karma Points awarded to Volunteer.',
      donation
    });
  } catch (error: any) {
    console.error('QR verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing verification check' });
  }
};
