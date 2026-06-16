import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getNotificationHistory
} from '../controllers/notificationController';

const router = Router();

router.use(protect); // Protect all routes

router.get('/', getNotifications);
router.get('/history', getNotificationHistory);
router.put('/read-all', markAllRead); // static before dynamic id route
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
