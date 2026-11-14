import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { createIssue } from '../controllers/issue.controller';
import { Issue } from '../models/Issue';
import { User } from '../models/User';

// Mock mongoose models
vi.mock('../models/Issue');
vi.mock('../models/User');

describe('Issue Controller - createIssue', () => {
  it('should return 400 if fields are missing', async () => {
    const req = {
      body: {},
      user: { _id: 'user123' }
    } as unknown as Request;
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await createIssue(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields (subject, description) are required' });
  });

  it('should return 400 if subject exceeds 80 characters', async () => {
    const req = {
      body: { subject: 'a'.repeat(81), description: 'Test' },
      user: { _id: 'user123' }
    } as unknown as Request;
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await createIssue(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Subject must be 80 characters or less' });
  });
});
