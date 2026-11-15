import { Request, Response, NextFunction } from 'express';

export const requirePasswordChanged = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.mustChangePassword) {
    const rawPath = (req.originalUrl || req.baseUrl + req.path || req.path || req.url).split('?')[0];

    const isProfileExempt =
      (req.method === 'GET' || req.method === 'PUT') &&
      (rawPath === '/api/users/profile' || rawPath.endsWith('/profile') || rawPath === '/api/users/me' || rawPath.endsWith('/me'));

    const isAuthExempt =
      req.method === 'POST' &&
      (rawPath === '/api/auth/logout' || rawPath.endsWith('/logout') || rawPath === '/api/auth/refresh' || rawPath.endsWith('/refresh'));

    if (isProfileExempt || isAuthExempt) {
      return next();
    }

    return res.status(403).json({
      message: 'Password change required before accessing other resources',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  }

  next();
};
