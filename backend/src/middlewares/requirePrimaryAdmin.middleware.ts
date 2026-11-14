import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';

export const requirePrimaryAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const userId = req.user._id || (req.user as any).id;
    const userDoc = await User.findById(userId);

    if (!userDoc) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (userDoc.isPrimaryAdmin) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: Primary Admin only' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
