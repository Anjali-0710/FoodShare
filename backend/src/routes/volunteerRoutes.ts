import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getAssignedPickups, getLeaderboard } from '../controllers/volunteerController';

const router = Router();

router.use(protect);

router.get('/pickups', authorize('volunteer'), getAssignedPickups);
router.get('/leaderboard', getLeaderboard); // Shared leaderboard view

export default router;
