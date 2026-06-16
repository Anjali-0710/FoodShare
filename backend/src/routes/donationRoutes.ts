import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createDonation,
  getDonations,
  getDonationById,
  acceptDonation,
  assignVolunteer,
  updateStatus,
  verifyQR
} from '../controllers/donationController';

const router = Router();

router.use(protect); // Protect all routes

// ⚠️ Static routes MUST come before dynamic /:id routes in Express
router.post('/', createDonation);
router.get('/', getDonations);
router.post('/verify-qr', verifyQR);   // moved above /:id to prevent wildcard collision

// Dynamic :id routes
router.get('/:id', getDonationById);
router.put('/:id/accept', acceptDonation);
router.put('/:id/assign', assignVolunteer);
router.put('/:id/status', updateStatus);

export default router;
