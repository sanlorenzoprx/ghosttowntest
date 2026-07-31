export const GHOSTTOWN_30_DAY_PLAN_V1 = {
  offerId: 'ghosttown_30_day_plan_v1',
  version: '1.0',
  name: 'GhostTown Launch Blueprint',
  subtitle: 'Your personalized 30-day idea-to-evidence launch system',
  customerPromise: [
    'Personalized 30-day launch roadmap',
    'Clear offer and pricing strategy',
    'Target-customer and positioning plan',
    'Current customer-access and Media & Distribution Network research',
    'Landing-page messaging and sales copy',
    'Customer outreach scripts and action plan',
    'Weekly priorities, milestones, and success metrics',
    'Thirty-day daily execution calendar',
    'Personalized Cloudflare Launch Site Starter',
    'Downloadable plan and finished assets saved to the customer account'
  ],
  launchSiteInvariant: 'The Launch Site is the working implementation of the landing-page messaging, offer, pricing, and call to action created in the Blueprint—not a separate unrelated bonus.',
  amountCents: 9700,
  currency: 'usd',
  stripePriceEnv: 'STRIPE_30_DAY_PLAN_PRICE_ID',
  displayPriceEnv: 'VITE_30_DAY_PLAN_DISPLAY_PRICE',
  active: true
} as const;

export const DEFAULT_30_DAY_PLAN_DISPLAY_PRICE = '$97.00';
export const LEGACY_7_DAY_PLAN_LABEL = '7-Day Validation Plan';
