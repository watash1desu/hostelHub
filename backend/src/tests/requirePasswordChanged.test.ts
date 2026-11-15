import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requirePasswordChanged } from '../middlewares/requirePasswordChanged.middleware';

describe('requirePasswordChanged Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/issues',
      user: {
        _id: 'user123' as any,
        role: 'STUDENT',
        hostelId: 'hostel123',
        mustChangePassword: true
      }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should block requests on normal routes when mustChangePassword is true', () => {
    req.originalUrl = '/api/issues';
    req.method = 'GET';

    requirePasswordChanged(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PASSWORD_CHANGE_REQUIRED'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should block admin routes when mustChangePassword is true', () => {
    req.originalUrl = '/api/admin/menu';
    req.method = 'GET';

    requirePasswordChanged(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PASSWORD_CHANGE_REQUIRED'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow GET /api/users/profile when mustChangePassword is true', () => {
    req.originalUrl = '/api/users/profile';
    req.method = 'GET';

    requirePasswordChanged(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow PUT /api/users/profile when mustChangePassword is true', () => {
    req.originalUrl = '/api/users/profile';
    req.method = 'PUT';

    requirePasswordChanged(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow POST /api/auth/logout and POST /api/auth/refresh when mustChangePassword is true', () => {
    req.originalUrl = '/api/auth/logout';
    req.method = 'POST';

    requirePasswordChanged(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    req.originalUrl = '/api/auth/refresh';
    req.method = 'POST';

    requirePasswordChanged(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow normal routes when mustChangePassword is false (unblocked after change)', () => {
    req.user!.mustChangePassword = false;
    req.originalUrl = '/api/issues';
    req.method = 'GET';

    requirePasswordChanged(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
