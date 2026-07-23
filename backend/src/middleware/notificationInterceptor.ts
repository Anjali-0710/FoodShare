import { Response } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { createNotificationInternal } from '../controllers/notificationController';
import { User } from '../models/User';
import { mockUsers } from '../config/mockDb';
import { getDbStatus } from '../config/db';

// Extract donor/ngo/volunteer details to resolve targets
const getAdmins = async () => {
  const isDb = getDbStatus();
  if (isDb) {
    return User.find({ role: 'admin' }).select('_id id');
  } else {
    return mockUsers.filter(u => u.role === 'admin');
  }
};

const getNgos = async () => {
  const isDb = getDbStatus();
  if (isDb) {
    return User.find({ role: 'ngo' }).select('_id id');
  } else {
    return mockUsers.filter(u => u.role === 'ngo');
  }
};

const handleNotificationTrigger = async (req: AuthenticatedRequest, body: any) => {
  const path = req.baseUrl + req.path;
  const method = req.method;

  // 1. User Registration Interceptor
  if (path === '/api/auth/register' && method === 'POST') {
    const newUser = body.user;
    if (newUser) {
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotificationInternal({
          userId: admin.id || (admin as any)._id,
          role: 'admin',
          type: 'system_alert',
          title: 'New User Registered 👤',
          message: `New user ${newUser.name} registered as a ${newUser.role.toUpperCase()} (${newUser.email}).`
        });
      }
    }
    return;
  }

  // 2. Donation Created Interceptor
  if (path === '/api/donations' && method === 'POST') {
    const donation = body.donation;
    if (donation) {
      const donorId = donation.donorId;
      const donorName = donation.donorName || req.user?.name || 'Partner';
      const foodType = donation.foodType;
      const quantity = donation.quantity;
      const unit = donation.unit;

      // Notify Donor
      await createNotificationInternal({
        userId: donorId,
        role: 'donor',
        type: 'donation_created',
        title: 'Donation Listed! 🍎',
        message: `Your food offer for ${foodType} (${quantity} ${unit}) has been listed. Awaiting NGO acceptance.`,
        donationId: donation.id || donation._id
      });

      // Notify Admins
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotificationInternal({
          userId: admin.id || (admin as any)._id,
          role: 'admin',
          type: 'donation_activity',
          title: 'New Donation Offer',
          message: `Donor "${donorName}" has listed surplus food: ${foodType} (${quantity} ${unit}).`,
          donationId: donation.id || donation._id
        });
      }

      // Notify NGOs
      const ngos = await getNgos();
      for (const ngo of ngos) {
        await createNotificationInternal({
          userId: ngo.id || (ngo as any)._id,
          role: 'ngo',
          type: 'new_donation',
          title: 'New Food Offer Nearby! 📦',
          message: `A fresh donation of ${foodType} (${quantity} ${unit}) is available for accept at ${donation.pickupAddress || 'local hub'}.`,
          donationId: donation.id || donation._id
        });
      }
    }
    return;
  }

  // 3. Donation Accepted Interceptor
  if (path.match(/\/api\/donations\/[a-zA-Z0-9_-]+\/accept/) && method === 'PUT') {
    const donation = body.donation;
    if (donation) {
      const donorId = donation.donorId;
      const ngoId = donation.ngoId;
      const ngoName = donation.ngoName || req.user?.name || 'NGO';
      const donorName = donation.donorName || 'Donor';
      const foodType = donation.foodType;

      // Notify Donor
      await createNotificationInternal({
        userId: donorId,
        role: 'donor',
        type: 'accepted',
        title: 'Donation Accepted! 🎉',
        message: `NGO "${ngoName}" has accepted your donation of ${foodType}.`,
        donationId: donation.id || donation._id
      });

      // Notify NGO
      await createNotificationInternal({
        userId: ngoId,
        role: 'ngo',
        type: 'accepted',
        title: 'Donation Claimed',
        message: `You accepted donation: ${foodType} from "${donorName}". Pending volunteer assignment.`,
        donationId: donation.id || donation._id
      });

      // Notify Admins
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotificationInternal({
          userId: admin.id || (admin as any)._id,
          role: 'admin',
          type: 'donation_activity',
          title: 'Donation Accepted',
          message: `NGO "${ngoName}" accepted food from "${donorName}".`,
          donationId: donation.id || donation._id
        });
      }
    }
    return;
  }

  // 4. Volunteer Assigned Interceptor
  if (path.match(/\/api\/donations\/[a-zA-Z0-9_-]+\/assign/) && method === 'PUT') {
    const donation = body.donation;
    if (donation) {
      const donorId = donation.donorId;
      const ngoId = donation.ngoId;
      const volunteerId = donation.volunteerId;
      const volunteerName = donation.volunteerName || req.user?.name || 'Volunteer';
      const donorName = donation.donorName || 'Donor';
      const ngoName = donation.ngoName || 'NGO';
      const foodType = donation.foodType;

      // Notify Donor
      if (donorId) {
        await createNotificationInternal({
          userId: donorId,
          role: 'donor',
          type: 'volunteer_assigned',
          title: 'Volunteer Assigned 🚚',
          message: `Volunteer "${volunteerName}" is assigned to pick up your donation.`,
          donationId: donation.id || donation._id
        });
      }

      // Notify NGO
      if (ngoId) {
        await createNotificationInternal({
          userId: ngoId,
          role: 'ngo',
          type: 'volunteer_assigned',
          title: 'Volunteer En-Route',
          message: `Volunteer "${volunteerName}" has claimed the pickup of your accepted donation.`,
          donationId: donation.id || donation._id
        });
      }

      // Notify NGO
      if (volunteerId) {
        await createNotificationInternal({
          userId: volunteerId,
          role: 'ngo',
          type: 'new_assignment',
          title: 'New Delivery Claimed! 🚚',
          message: `You claimed transport for ${foodType} from "${donorName}" to "${ngoName}".`,
          donationId: donation.id || donation._id
        });
      }

      // Notify Admins
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotificationInternal({
          userId: admin.id || (admin as any)._id,
          role: 'admin',
          type: 'donation_activity',
          title: 'NGO Claimed Route',
          message: `NGO "${volunteerName}" assigned to deliver donation from "${donorName}" to "${ngoName}".`,
          donationId: donation.id || donation._id
        });
      }
    }
    return;
  }

  // 5. Status Updates (Picked Up / Delivered)
  if (path.match(/\/api\/donations\/[a-zA-Z0-9_-]+\/status/) && method === 'PUT') {
    const donation = body.donation;
    const reqStatus = req.body.status;

    if (donation) {
      const donorId = donation.donorId;
      const ngoId = donation.ngoId;
      const volunteerId = donation.volunteerId;
      const volunteerName = donation.volunteerName || req.user?.name || 'NGO';
      const ngoName = donation.ngoName || 'NGO';
      const foodType = donation.foodType;

      if (reqStatus === 'Picked Up') {
        // Notify Donor
        if (donorId) {
          await createNotificationInternal({
            userId: donorId,
            role: 'donor',
            type: 'pickup_started',
            title: 'Donation Dispatched 📦',
            message: `NGO "${volunteerName}" has picked up your surplus food.`,
            donationId: donation.id || donation._id
          });
        }

        // Notify NGO
        if (volunteerId) {
          await createNotificationInternal({
            userId: volunteerId,
            role: 'ngo',
            type: 'pickup_reminder',
            title: 'Pickup Confirmed! ✅',
            message: `Cargo loaded. Drive to dropoff location: "${ngoName}".`,
            donationId: donation.id || donation._id
          });
        }
      } else if (reqStatus === 'Delivered') {
        // Notify NGO
        if (ngoId) {
          await createNotificationInternal({
            userId: ngoId,
            role: 'ngo',
            type: 'delivery_completed',
            title: 'Delivery Arrived! 🏢',
            message: `NGO "${volunteerName}" arrived with your food donation. Open details to scan QR and finalize.`,
            donationId: donation.id || donation._id
          });
        }
      }
    }
    return;
  }

  // 6. QR Code Verification (Finalized Completion)
  if (path === '/api/donations/verify-qr' && method === 'POST') {
    const donation = body.donation;
    if (donation) {
      const donorId = donation.donorId;
      const ngoId = donation.ngoId;
      const volunteerId = donation.volunteerId;
      const ngoName = donation.ngoName || 'NGO';
      const volunteerName = donation.volunteerName || 'NGO';
      const foodType = donation.foodType;

      // Notify Donor
      if (donorId) {
        await createNotificationInternal({
          userId: donorId,
          role: 'donor',
          type: 'delivery_completed',
          title: 'Surplus Delivered! 💚',
          message: `Your donation of ${foodType} has been successfully verified and delivered to NGO "${ngoName}".`,
          donationId: donation.id || donation._id
        });
      }

      // Notify NGO
      if (ngoId) {
        await createNotificationInternal({
          userId: ngoId,
          role: 'ngo',
          type: 'delivery_completed',
          title: 'Delivery Verified 🎉',
          message: `QR code successfully verified. Food donation of ${foodType} marked completed.`,
          donationId: donation.id || donation._id
        });
      }

      // Notify Admins
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotificationInternal({
          userId: admin.id || (admin as any)._id,
          role: 'admin',
          type: 'donation_activity',
          title: 'Donation Completed',
          message: `Donation ${foodType} completed delivery to NGO "${ngoName}" via Volunteer "${volunteerName}".`,
          donationId: donation.id || donation._id
        });
      }
    }
    return;
  }
};

export const notificationInterceptor = (req: AuthenticatedRequest, res: Response, next: any) => {
  const originalJson = res.json;

  // Override res.json to capture body of interest
  res.json = function (body: any) {
    res.json = originalJson; // Restore original json method
    const result = originalJson.call(this, body);

    // Process notification async only on successful responses
    if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
      handleNotificationTrigger(req, body).catch(err => {
        console.error('Notification Interception Error:', err);
      });
    }

    return result;
  };

  next();
};
