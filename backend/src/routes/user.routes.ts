import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.middleware';
import { getMe, updateProfile } from '../controllers/user.controller';

const router = Router();

router.get('/me', verifyToken, getMe);
router.get('/profile', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);
router.patch('/profile', verifyToken, updateProfile);
router.patch('/me', verifyToken, updateProfile);

export default router;
