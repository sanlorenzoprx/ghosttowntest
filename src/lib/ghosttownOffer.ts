export const GHOSTTOWN_30_DAY_PLAN_V1 = {
  offerId: 'ghosttown_30_day_plan_v1',
  version: '1.0',
  name: 'GhostTown Launch Blueprint',
  subtitle: 'Your 30-day plan, one clear next step at a time',
  customerPromise: [
    'Open GhostTown each day and see what to do next',
    'Download the full PDF anytime to see the whole 30-day plan',
    'Get reminders for your next step, follow-up, or weekly check-in',
    'Tell GhostTown what happened and get help deciding what to do next',
    'Change your messages, offer, or plan as you learn what people really want',
    'Start with up to three useful examples GhostTown finds for your market',
    'Know what to offer and what to charge',
    'Know who to sell to first',
    'Find places where you can reach likely customers',
    'Get sales-page words written for your idea',
    'Get messages you can use to contact customers',
    'See simple weekly goals so you know if you are making progress',
    'Know when to keep going, change direction, pause, or stop',
    'Get a real launch website built around your idea and offer',
    'Keep your plan, work, and files together in your account'
  ],
  launchSiteInvariant: 'Your Launch Website uses the offer, price, message, and next step from your Blueprint. It is part of the same plan, not a separate bonus.',
  amountCents: 9700,
  currency: 'usd',
  stripePriceEnv: 'STRIPE_30_DAY_PLAN_PRICE_ID',
  displayPriceEnv: 'VITE_30_DAY_PLAN_DISPLAY_PRICE',
  active: true
} as const;

export const DEFAULT_30_DAY_PLAN_DISPLAY_PRICE = '$97.00';
export const LEGACY_7_DAY_PLAN_LABEL = '7-Day Validation Plan';
