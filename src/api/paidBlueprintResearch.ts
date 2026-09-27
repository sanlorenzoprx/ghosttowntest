import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';

/**
 * General Distribution Footprint research remains disabled unless its global
 * switch is explicitly enabled. The paid-only override is narrower: acceptance
 * requires verified Stripe test-mode evidence, while production requires
 * verified Stripe live-mode evidence after the Gate 36 release flag is enabled.
 */
export function paidBlueprintResearchEnabled(env: Env, order: PaidTestOrder): boolean {
  if (env.DISTRIBUTION_FOOTPRINT_ENABLED === 'true') return true;
  if (env.PAID_BLUEPRINT_RESEARCH_ENABLED !== 'true') return false;

  const paidEvidence = Boolean(order.paidAt)
    && Boolean(order.stripeCheckoutSessionId)
    && Boolean(order.stripeEventId);
  if (!paidEvidence) return false;

  return (env.DEPLOYMENT_ENV === 'acceptance' && order.stripeMode === 'test')
    || (env.DEPLOYMENT_ENV === 'production' && order.stripeMode === 'live');
}

export function researchEnvForPaidBlueprint(env: Env, order: PaidTestOrder): Env {
  if (!paidBlueprintResearchEnabled(env, order)) return env;
  if (env.DISTRIBUTION_FOOTPRINT_ENABLED === 'true') return env;

  // Inherit from the real Worker env instead of spreading it. Cloudflare
  // bindings remain available through the prototype while this paid-only view
  // enables Distribution Footprint research for the verified order execution.
  const researchEnv = Object.create(env) as Env;
  researchEnv.DISTRIBUTION_FOOTPRINT_ENABLED = 'true';
  // Paid Sprints never consume the free Evidence Scan YouTube key. When a
  // dedicated paid key is not configured, YouTube simply becomes unavailable
  // and the independent web/backlink providers carry discovery.
  researchEnv.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY_PAID?.trim() || undefined;
  return researchEnv;
}
