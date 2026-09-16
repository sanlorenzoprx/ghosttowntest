export const GHOSTTOWN_30_DAY_PLAN_V1 = {
  offerId: 'ghosttown_30_day_plan_v1',
  version: '1.0',
  name: 'GhostTown 30-Day Evidence Sprint',
  subtitle: 'Your 30-day plan, one clear next step at a time',
  persuasion: {
    gain: 'Know whether to keep going, change something, or stop.',
    relief: 'No guessing what to research or test next. GhostTown shows you what to do next.',
    risk: 'Do nothing different and another month can disappear into building before you know if buyers care.',
    miss: 'Do not give up on a good idea because you tested the wrong customer, message, price, or offer.',
    immediatePayoff: 'Start with one clear test and what to do in the next 48 hours.',
    truthBoundary: 'The Sprint helps you make a better next decision. It does not promise sales or success.'
  },
  customerPromise: [
    'Open GhostTown each day and see what to do next',
    'See what result means keep going, change something, or stop',
    'Download the full PDF anytime to see the whole 30-day plan',
    'Get reminders for your next step, follow-up, or weekly check-in',
    'Tell GhostTown what happened and get help deciding what to do next',
    'Change one thing at a time as you learn what buyers want',
    'Start with up to three useful examples GhostTown finds for your market',
    'Know who to talk to and what to ask',
    'Get words you can use to reach buyers',
    'Keep your plan, work, and files together in your account',
    'Finish with a clear choice: keep going, change something, pause, or stop'
  ],
  scopeBoundary: 'The Sprint does not include a live website, domain, publishing, or payment setup. Those are separate products.',
  amountCents: 9700,
  currency: 'usd',
  stripePriceEnv: 'STRIPE_30_DAY_PLAN_PRICE_ID',
  displayPriceEnv: 'VITE_30_DAY_PLAN_DISPLAY_PRICE',
  active: true
} as const;

export const DEFAULT_30_DAY_PLAN_DISPLAY_PRICE = '$97.00';
export const LEGACY_7_DAY_PLAN_LABEL = '7-Day Validation Plan';
