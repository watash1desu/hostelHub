export interface MenuChangePolicy {
  minVotersPercent: number;
  minVoters: number;
  cooldownDays: number;
}

export interface EvaluateChangeRequestParams {
  totalVoters: number;
  wantingVoters: number;
  lastPublishedAt?: Date | string | null;
  now?: Date | string | null;
  policy?: Partial<MenuChangePolicy>;
}

export interface ChangeRequestResult {
  requested: boolean;
  percent: number;
  cooldownEndsAt: string | null;
  reason: string;
}

export const evaluateChangeRequest = ({
  totalVoters,
  wantingVoters,
  lastPublishedAt,
  now,
  policy
}: EvaluateChangeRequestParams): ChangeRequestResult => {
  const minVoters = policy?.minVoters ?? 10;
  const minVotersPercent = policy?.minVotersPercent ?? 60;
  const cooldownDays = policy?.cooldownDays ?? 14;

  const percent = totalVoters > 0 ? Math.round((wantingVoters / totalVoters) * 100) : 0;

  let cooldownEndsAt: string | null = null;
  let inCooldown = false;

  if (lastPublishedAt) {
    const lastDate = new Date(lastPublishedAt);
    const cooldownEnd = new Date(lastDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
    const currentDate = now ? new Date(now) : new Date();
    if (cooldownEnd.getTime() > currentDate.getTime()) {
      inCooldown = true;
      cooldownEndsAt = cooldownEnd.toISOString();
    }
  }

  if (totalVoters < minVoters) {
    return {
      requested: false,
      percent,
      cooldownEndsAt,
      reason: 'too few voters'
    };
  }

  if (percent < minVotersPercent) {
    return {
      requested: false,
      percent,
      cooldownEndsAt,
      reason: 'below threshold'
    };
  }

  if (inCooldown) {
    return {
      requested: true,
      percent,
      cooldownEndsAt,
      reason: 'in cooldown'
    };
  }

  return {
    requested: true,
    percent,
    cooldownEndsAt: null,
    reason: 'after cooldown'
  };
};
