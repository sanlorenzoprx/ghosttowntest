export const GHOSTTOWN_30_DAY_PLAN_V1 = {
  offerId: 'ghosttown_30_day_plan_v1',
  version: '1.0',
  name: 'GhostTown Launch Blueprint',
  subtitle: 'Your map, your next move, and an AI copilot for the next 30 days',
  customerPromise: [
    'Interactive 30-day execution calendar that opens each day’s exact actions, prepared assets, evidence prompts, and decision context',
    'A durable PDF map of the full 30-day route, so you can always see the plan, milestones, evidence gates, and destination',
    'Daily reminders that bring you back to the next action, follow-up, or checkpoint so momentum does not die after purchase',
    'Execution Copilot tied to the day you are working on, using the evidence you record to help interpret what changed and what to do next',
    'AI-assisted revisions and editable working copies so scripts, offers, messaging, and execution assets can improve as the market answers back',
    'GhostTown-researched opportunity map with up to three verified market or reference resources preselected after purchase',
    'Clear offer and pricing strategy',
    'Target-customer and positioning plan',
    'Current customer-access and Media & Distribution Network research',
    'Landing-page messaging and sales copy',
    'Customer outreach scripts and action plan',
    'Weekly priorities, milestones, and success metrics',
    'Evidence checkpoints that tell you when to continue, revise, pivot, pause, or stop',
    'Custom Launch Website — a real website built around your idea, offer, and customer',
    'Prepared assets stay openable, editable, and exportable from your account'
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
