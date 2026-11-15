import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { registerStudent, login } from '../controllers/auth.controller';
import { approveUser } from '../controllers/adminUser.controller';
import { User } from '../models/User';
import { Hostel } from '../models/Hostel';
import { ActivityLog } from '../models/ActivityLog';
import { generateRefreshToken } from '../utils/jwt';
import bcrypt from 'bcrypt';

vi.mock('../models/User');
vi.mock('../models/Hostel');
vi.mock('../models/ActivityLog');
vi.mock('../utils/jwt', () => ({
  generateRefreshToken: vi.fn().mockResolvedValue('mocked-refresh-token'),
  generateAccessToken: vi.fn().mockReturnValue('mocked-token')
}));
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn()
  },
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn()
}));

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const makeReq = (body: any = {}, params: any = {}, user: any = undefined): Request =>
  ({ body, params, user, query: {} } as any);

const noop = vi.fn() as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Student Join Code & Approval Flow', () => {
  it('bad code: rejects registration with invalid join code', async () => {
    vi.mocked(Hostel.findOne).mockResolvedValue(null);

    const req = makeReq({
      joinCode: 'BADCOD',
      name: 'John Doe',
      roomNo: '101',
      email: 'john@example.com',
      password: 'password123'
    });
    const res = makeRes();

    await registerStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Invalid join code',
      field: 'joinCode'
    }));
  });

  it('duplicate email: rejects registration if email already exists', async () => {
    vi.mocked(Hostel.findOne).mockResolvedValue({
      _id: 'hostel123',
      domain: 'myhostel',
      joinCode: 'JOIN99'
    } as any);

    vi.mocked(User.findOne).mockResolvedValue({
      _id: 'existingUser',
      email: 'existing@example.com'
    } as any);

    const req = makeReq({
      joinCode: 'JOIN99',
      name: 'John Doe',
      roomNo: '101',
      email: 'existing@example.com',
      password: 'password123'
    });
    const res = makeRes();

    await registerStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      field: 'email'
    }));
  });

  it('pending blocked: login rejects account with status PENDING', async () => {
    const pendingUser = {
      _id: 'pendingId',
      username: '101.1@myhostel',
      passwordHash: 'hashed-password',
      status: 'PENDING',
      isActive: true,
      role: 'STUDENT'
    };

    vi.mocked(User.findOne).mockResolvedValue(pendingUser as any);

    const req = makeReq({
      username: '101.1@myhostel',
      password: 'password123'
    });
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/pending approval/i)
    }));
  });

  it('approve then login: primary admin approves student, then login succeeds', async () => {
    const studentUser = {
      _id: 'student123',
      name: 'John Doe',
      username: '101.1@myhostel',
      passwordHash: 'hashed-password',
      status: 'PENDING',
      isActive: true,
      role: 'STUDENT',
      hostelId: 'hostel123',
      save: vi.fn().mockImplementation(function (this: any) {
        this.status = 'ACTIVE';
        return Promise.resolve(this);
      })
    };

    vi.mocked(User.findById).mockResolvedValue({
      _id: 'admin123',
      isPrimaryAdmin: true,
      hostelId: 'hostel123'
    } as any);

    vi.mocked(User.findOne).mockResolvedValue(studentUser as any);
    vi.mocked(ActivityLog.create).mockResolvedValue({} as any);

    // 1. Primary admin approves student
    const approveReq = makeReq({}, { userId: 'student123' }, { _id: 'admin123' });
    const approveRes = makeRes();

    await approveUser(approveReq, approveRes, noop);

    expect(approveRes.status).toHaveBeenCalledWith(200);
    expect(studentUser.save).toHaveBeenCalled();
    expect(studentUser.status).toBe('ACTIVE');

    // 2. Student logs in successfully after approval
    studentUser.status = 'ACTIVE';
    vi.mocked(User.findOne).mockResolvedValue(studentUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const loginReq = makeReq({
      username: '101.1@myhostel',
      password: 'password123'
    });
    const loginRes = makeRes();

    await login(loginReq, loginRes);

    expect(loginRes.status).toHaveBeenCalledWith(200);
    expect(loginRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Login successful',
      accessToken: 'mocked-token'
    }));
  });
});
