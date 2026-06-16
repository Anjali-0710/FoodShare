import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { uploadImage } from '../controllers/uploadController';

const router = Router();

// Protect route endpoints
router.post('/', protect, uploadImage);

export default router;
