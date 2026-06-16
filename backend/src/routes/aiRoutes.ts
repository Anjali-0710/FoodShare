import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getFreshnessPrediction, getNgoRecommendations, getDemandPrediction } from '../controllers/aiController';

const router = Router();

router.use(protect);

router.get('/freshness', getFreshnessPrediction);
router.post('/recommend-ngos', getNgoRecommendations);
router.get('/demand', getDemandPrediction);

export default router;
