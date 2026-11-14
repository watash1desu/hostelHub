import { Router } from 'express';
import {
  createUser,
  bulkCreateUsers,
  getUsers,
  getUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  updateUser,
} from '../controllers/adminUser.controller';
import { verifyToken } from '../middlewares/verifyToken.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { requirePrimaryAdmin } from '../middlewares/requirePrimaryAdmin.middleware';

const router = Router();

// All user management routes require primary admin
router.use(verifyToken);
router.use(requireRole('ADMIN'));
router.use(requirePrimaryAdmin);

// Create user
router.post('/', createUser);

// Bulk create users
router.post('/bulk', bulkCreateUsers);

// Get all users
router.get('/', getUsers);

// Get single user
router.get('/:userId', getUser);

// Update user
router.put('/:userId', updateUser);

// Deactivate user
router.patch('/:userId/deactivate', deactivateUser);

// Reactivate user
router.patch('/:userId/reactivate', reactivateUser);

// Delete user
router.delete('/:userId', deleteUser);

export default router;
