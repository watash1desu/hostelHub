import express from 'express';
import { getSettings, updateSettings, previewMenuConstraints, confirmMenuConstraints, deleteHostel } from '../controllers/adminSettings.controller';
import { requireRole } from '../middlewares/requireRole.middleware';
import { requirePermission } from '../middlewares/requirePermission.middleware';
import { requirePrimaryAdmin } from '../middlewares/requirePrimaryAdmin.middleware';

const router = express.Router();

router.get('/', requireRole('ADMIN'), requirePrimaryAdmin, getSettings);
router.put('/', requireRole('ADMIN'), requirePrimaryAdmin, updateSettings);
router.post('/menu-constraints/preview', requireRole('ADMIN'), requirePermission('MANAGE_MENU'), previewMenuConstraints);
router.post('/menu-constraints/confirm', requireRole('ADMIN'), requirePermission('MANAGE_MENU'), confirmMenuConstraints);
router.delete('/hostel', requireRole('ADMIN'), requirePrimaryAdmin, deleteHostel);

export default router;
