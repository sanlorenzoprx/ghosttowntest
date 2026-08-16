import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';

/**
 * General Distribution Footprint research remains disabled in acceptance and
 * production. The acceptance-only paid override exists solely so a verified
 * Stripe test-mode Launch Blueprint purchase can exercise the real fulfillment
 * path before production release.
 */
export function paidBlueprintResearchEnabled(env: Env, order: PaidTestOrder): boolean {
  return env.DISTRIBUTION_FOOTPRINT_ENABLED === 'true'
    || (
      env.DEPLOYMENT_ENV === 'acceptance'
      && env.PAID_BLUEPRINT_RESEARCH_ENABLED === 'true'
      && order.stripeMode === 'test'
      && Boolean(order.paidAt)
      && Boolean(order.stripeCheckoutSessionId)
      && Boolean(order.stripeEventId)
    );
}

export function researchEnvForPaidBlueprint(env: Env, order: PaidTestOrder): Env {
  if (!paidBlueprintResearchEnabled(env, order)) return env;
  if (env.DISTRIBUTION_FOOTPRINT_ENABLED === 'true') return env;
  return { ...env, DISTRIBUTION_FOOTPRINT_ENABLED: 'true' };
}
