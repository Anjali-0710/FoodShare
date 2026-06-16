import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  calculateDistance,
  validateLocation,
  calculateRouteETA
} from '../controllers/locationController';

const router = Router();

// Secure all endpoints under auth middleware
router.use(protect);

router.post('/distance', calculateDistance);
router.post('/validate', validateLocation);
router.post('/route-eta', calculateRouteETA);

export default router;
