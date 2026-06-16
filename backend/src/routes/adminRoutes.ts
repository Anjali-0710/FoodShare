import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
  getUsers,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getDonationsAdmin,
  updateDonationStatusAdmin,
  deleteDonationAdmin,
  getSystemActivities,
  getAnalytics,
  getReportsAdmin
} from '../controllers/adminController';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/donations', getDonationsAdmin);
router.put('/donations/:id/status', updateDonationStatusAdmin);
router.delete('/donations/:id', deleteDonationAdmin);

router.get('/logs', getSystemActivities);
router.get('/analytics', getAnalytics);
router.get('/reports', getReportsAdmin);

export default router;
