import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getFreshnessPrediction, getNgoRecommendations, getDemandPrediction, chatWithAi } from '../controllers/aiController';
import { chatRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(protect);

router.get('/freshness', getFreshnessPrediction);
router.post('/recommend-ngos', getNgoRecommendations);
router.get('/demand', getDemandPrediction);
router.post('/chat', chatRateLimiter, chatWithAi);

export default router;
