import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getFreshnessPrediction, getNgoRecommendations, getDemandPrediction, chatWithAi } from '../controllers/aiController';
import { chatRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/freshness', protect, getFreshnessPrediction);
router.post('/recommend-ngos', protect, getNgoRecommendations);
router.get('/demand', protect, getDemandPrediction);
router.post('/chat', chatRateLimiter, chatWithAi);

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI route working"
  });
});

export default router;
