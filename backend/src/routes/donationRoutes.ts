import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createDonation,
  getDonations,
  getDonationById,
  acceptDonation,
  updateStatus,
  verifyQR
} from '../controllers/donationController';

const router = Router();

router.use(protect); // Protect all routes

router.post('/', createDonation);
router.get('/', getDonations);
router.post('/verify-qr', verifyQR);

router.get('/:id', getDonationById);
router.put('/:id/accept', acceptDonation);
router.put('/:id/status', updateStatus);

export default router;
