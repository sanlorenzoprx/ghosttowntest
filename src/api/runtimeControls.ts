import type { Env } from './env';

export interface HourlyRateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfter: number;
}

function secondsUntilNextUtcHour(now: Date): number {
  const next = new Date(now);
  next.setUTCMinutes(60, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

export async function consumeHourlyRateLimit(
  env: Env,
  scope: string,
  limit: number,
  now = new Date()
): Promise<HourlyRateLimitResult> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  if (!scope.trim() || !Number.isInteger(limit) || limit < 1) {
    throw new Error('Invalid atomic rate-limit configuration');
  }

  const windowKey = now.toISOString().slice(0, 13);
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const write = await env.DB.prepare(`
    INSERT INTO runtime_rate_limits (scope, window_key, used, expires_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(scope, window_key) DO UPDATE SET
      used = runtime_rate_limits.used + 1,
      expires_at = excluded.expires_at
    WHERE runtime_rate_limits.used < ?
  `).bind(scope, windowKey, expiresAt, limit).run();

  const row = await env.DB.prepare(`
    SELECT used
    FROM runtime_rate_limits
    WHERE scope = ? AND window_key = ?
  `).bind(scope, windowKey).first<{ used: number }>();

  return {
    allowed: (write.meta?.changes ?? 0) === 1,
    used: Math.max(0, Number(row?.used) || 0),
    limit,
    retryAfter: secondsUntilNextUtcHour(now)
  };
}

type ProductionBindingName = 'DB' | 'BLUEPRINTS' | 'LAUNCH_BLUEPRINT_WORKFLOW';

function requiredProductionBindings(request: Request): ProductionBindingName[] {
  if (request.method === 'OPTIONS') return [];
  const path = new URL(request.url).pathname;
  const required = new Set<ProductionBindingName>();

  if (/^\/api\/paid-test\/orders\/[^/]+\/blueprint(?:\/|$)/.test(path)) {
    required.add('DB');
    if (/\/(?:pdf|assets)$/.test(path)) required.add('BLUEPRINTS');
    if (request.method === 'POST' && /\/(?:seeds|retry)$/.test(path)) {
      required.add('BLUEPRINTS');
      required.add('LAUNCH_BLUEPRINT_WORKFLOW');
    }
  }

  if (
    /^\/api\/paid-test\/orders\/[^/]+\/launch-site(?:\/|$)/.test(path)
    || /^\/api\/launch-sites\/[^/]+\/leads$/.test(path)
    || /^\/launch\/[^/]+$/.test(path)
  ) {
    required.add('DB');
  }

  return [...required];
}

export function productionRuntimeBindingGuard(request: Request, env: Env): Response | null {
  if (env.DEPLOYMENT_ENV !== 'production') return null;
  const required = requiredProductionBindings(request);
  if (!required.length) return null;

  const missing = required.filter(binding => !env[binding]);
  if (!missing.length) return null;

  console.error('Production GhostTown runtime binding unavailable', {
    path: new URL(request.url).pathname,
    missing
  });

  return new Response(JSON.stringify({
    error: 'This GhostTown capability is temporarily unavailable.',
    code: 'GHOSTTOWN_RUNTIME_UNAVAILABLE'
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': '300'
    }
  });
}
