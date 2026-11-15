import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerAdmin,
  registerStudent,
  login,
  refresh,
  logout,
  checkHostelAvailable
} from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/verifyToken.middleware';

const router = Router();

const availabilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const studentRegisterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts, please try again later.' }
});

// Public routes
router.get('/hostel-available', availabilityLimiter, checkHostelAvailable);
router.post('/admin/register', registerAdmin);
router.post('/student/register', studentRegisterLimiter, registerStudent);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes (Logout should be accessible even if token is expired to clear cookies)
router.post('/logout', logout);

export default router;
