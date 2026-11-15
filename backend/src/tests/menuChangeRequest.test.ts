import { describe, it, expect } from 'vitest';
import { evaluateChangeRequest } from '../services/menuChangeRequest.service';

describe('evaluateChangeRequest', () => {
  const defaultPolicy = {
    minVotersPercent: 60,
    minVoters: 10,
    cooldownDays: 14
  };

  it('below threshold: rejects when wanting voters percentage is below minVotersPercent', () => {
    const res = evaluateChangeRequest({
      totalVoters: 20,
      wantingVoters: 10, // 50% < 60%
      policy: defaultPolicy
    });

    expect(res.requested).toBe(false);
    expect(res.percent).toBe(50);
    expect(res.reason).toBe('below threshold');
  });

  it('too few voters: rejects when total voters is below minVoters', () => {
    const res = evaluateChangeRequest({
      totalVoters: 8, // < 10
      wantingVoters: 8, // 100%
      policy: defaultPolicy
    });

    expect(res.requested).toBe(false);
    expect(res.percent).toBe(100);
    expect(res.reason).toBe('too few voters');
  });

  it('in cooldown: flags cooldown when threshold is met but within cooldown window', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const lastPublishedAt = new Date('2026-11-10T12:00:00Z'); // 5 days ago, cooldown is 14 days

    const res = evaluateChangeRequest({
      totalVoters: 20,
      wantingVoters: 14, // 70% >= 60%
      lastPublishedAt,
      now,
      policy: defaultPolicy
    });

    expect(res.requested).toBe(true);
    expect(res.percent).toBe(70);
    expect(res.reason).toBe('in cooldown');
    expect(res.cooldownEndsAt).not.toBeNull();
    // Cooldown ends on 2026-11-24
    expect(new Date(res.cooldownEndsAt!).getTime()).toBeGreaterThan(now.getTime());
  });

  it('after cooldown: approves change request when threshold is met and cooldown has passed', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const lastPublishedAt = new Date('2026-10-25T12:00:00Z'); // 21 days ago, cooldown is 14 days

    const res = evaluateChangeRequest({
      totalVoters: 20,
      wantingVoters: 14, // 70% >= 60%
      lastPublishedAt,
      now,
      policy: defaultPolicy
    });

    expect(res.requested).toBe(true);
    expect(res.percent).toBe(70);
    expect(res.cooldownEndsAt).toBeNull();
    expect(res.reason).toBe('after cooldown');
  });
});
