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

// Phase 1 of the rollout replaces the post-verdict Sprint offer with a First 30
// email list. The Sprint offer, checkout, and fulfillment stay in the codebase,
// dormant, and return only when a deployment opts back in with "sprint".
export type PostVerdictOffer = 'first30_waitlist' | 'sprint';

export function resolvePostVerdictOffer(value: string | undefined | null): PostVerdictOffer {
  return value?.trim().toLowerCase() === 'sprint' ? 'sprint' : 'first30_waitlist';
}

export const GHOSTTOWN_FIRST_30_WAITLIST_V1 = {
  offerId: 'ghosttown_first_30_waitlist_v1',
  listId: 'first30',
  name: 'First 30',
  headline: 'First 30 opens soon',
  summary: 'Thirty days of guided help after your verdict: one clear step at a time, built around the evidence for your idea.',
  promise: [
    'One clear next step each day, based on what you learn',
    'Help deciding whether to keep going, change something, or stop',
    'The words and materials you need to reach your first customers'
  ],
  consentText: 'Email me when First 30 opens. GhostTown will use this address only for First 30 news, and I can ask to be removed at any time.',
  truthBoundary: 'Joining the list is free and does not buy anything. First 30 is not on sale yet.',
  es: {
    headline: 'First 30 abre pronto',
    summary: 'Treinta días de ayuda guiada después de tu veredicto: un paso claro a la vez, basado en la evidencia de tu idea.',
    promise: [
      'Un paso claro cada día, según lo que aprendes',
      'Ayuda para decidir si seguir, cambiar algo o parar',
      'Las palabras y materiales para llegar a tus primeros clientes'
    ],
    consentText: 'Envíenme un email cuando First 30 abra. GhostTown usará este email solo para noticias de First 30 y puedo pedir que me borren en cualquier momento.',
    truthBoundary: 'Unirte a la lista es gratis y no compra nada. First 30 todavía no está a la venta.'
  },
  active: true
} as const;
