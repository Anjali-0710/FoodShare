import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, updateProfile, verifyOtp, resendOtp } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.put('/profile', protect, updateProfile);

export default router;
