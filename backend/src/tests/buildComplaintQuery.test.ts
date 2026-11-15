import { describe, it, expect } from 'vitest';
import { buildComplaintQuery } from '../utils/buildComplaintQuery';

describe('buildComplaintQuery - Pure Query Builder', () => {
  it('defaults: applies default OPEN status, newest first sort, limit 10, skip 0', () => {
    const result = buildComplaintQuery();

    expect(result.filter).toEqual({ status: 'OPEN' });
    expect(result.sort).toEqual({ createdAt: -1 });
    expect(result.skip).toBe(0);
    expect(result.limit).toBe(10);
  });

  it('limit cap: caps limit at 50 even when higher values are requested', () => {
    const high = buildComplaintQuery({ limit: 100 });
    expect(high.limit).toBe(50);

    const stringParam = buildComplaintQuery({ limit: '999' });
    expect(stringParam.limit).toBe(50);

    const negative = buildComplaintQuery({ limit: -10 });
    expect(negative.limit).toBe(1);
  });

  it('rejected sortBy: rejects unknown sort keys and falls back to createdAt', () => {
    const invalidKey = buildComplaintQuery({ sortBy: 'injectedField' });
    expect(invalidKey.sort).toEqual({ createdAt: -1 });

    const sqlLike = buildComplaintQuery({ sortBy: 'DROP TABLE issues;' });
    expect(sqlLike.sort).toEqual({ createdAt: -1 });

    // Valid whitelisted fields should be accepted
    const validSubject = buildComplaintQuery({ sortBy: 'subject', order: 'asc' });
    expect(validSubject.sort).toEqual({ subject: 1 });

    const validRoom = buildComplaintQuery({ sortBy: 'roomNo', order: 'desc' });
    expect(validRoom.sort).toEqual({ roomNo: -1 });
  });

  it('regex escaping: escapes special regex characters in query string', () => {
    const result = buildComplaintQuery({ q: 'water (leak)* [urgent]? + $ ^ .' });

    expect(result.filter.$or).toBeDefined();
    expect(result.filter.$or).toHaveLength(4);

    const expectedEscaped = 'water \\(leak\\)\\* \\[urgent\\]\\? \\+ \\$ \\^ \\.';
    expect(result.filter.$or).toEqual([
      { subject: { $regex: expectedEscaped, $options: 'i' } },
      { description: { $regex: expectedEscaped, $options: 'i' } },
      { raisedByName: { $regex: expectedEscaped, $options: 'i' } },
      { roomNo: { $regex: expectedEscaped, $options: 'i' } },
    ]);
  });

  it('skip for page 3: calculates correct skip offset based on page and limit', () => {
    const result = buildComplaintQuery({ page: 3, limit: 10 });

    expect(result.skip).toBe(20);
    expect(result.limit).toBe(10);

    const customLimit = buildComplaintQuery({ page: 3, limit: 15 });
    expect(customLimit.skip).toBe(30);
    expect(customLimit.limit).toBe(15);
  });

  it('hostelId applied: enforces hostelId in the returned filter', () => {
    const result = buildComplaintQuery({
      hostelId: 'hostel_abc_123',
      status: 'CLOSED',
      q: 'broken tap',
    });

    expect(result.filter.hostelId).toBe('hostel_abc_123');
    expect(result.filter.status).toBe('CLOSED');
    expect(result.filter.$or).toBeDefined();
  });
});
