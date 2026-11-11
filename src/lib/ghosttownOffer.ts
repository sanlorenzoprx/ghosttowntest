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
export type PostVerdictOffer = 'first30_waitlist' | 'first30' | 'sprint';

export function resolvePostVerdictOffer(value: string | undefined | null): PostVerdictOffer {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'sprint') return 'sprint';
  if (normalized === 'first30') return 'first30';
  return 'first30_waitlist';
}

export const GHOSTTOWN_FIRST_30_WAITLIST_V1 = {
  offerId: 'ghosttown_first_30_waitlist_v1',
  listId: 'first30',
  name: 'First 30',
  headline: 'First 30 opens soon',
  summary: 'Thirty days of guided help after your verdict: one clear step at a time, built around the evidence for your idea. You start with the words your customers already use, not a guess.',
  promise: [
    'One clear next step each day, based on what you learn',
    'A customer-acquisition website for your business, written from what your likely customers actually say',
    'The words and materials you need to reach your first customers, made for the places where they are already talking',
    'Help deciding whether to keep going, change something, or stop'
  ],
  consentText: 'Email me when First 30 opens. GhostTown will use this address only for First 30 news, and I can ask to be removed at any time.',
  truthBoundary: 'Joining the list is free and does not buy anything. First 30 is not on sale yet.',
  es: {
    headline: 'First 30 abre pronto',
    summary: 'Treinta días de ayuda guiada después de tu veredicto: un paso claro a la vez, basado en la evidencia de tu idea. Empiezas con las palabras que tus clientes ya usan, no con una suposición.',
    promise: [
      'Un paso claro cada día, según lo que aprendes',
      'Un sitio web para conseguir clientes, escrito con lo que tus posibles clientes dicen de verdad',
      'Las palabras y materiales para llegar a tus primeros clientes, hechos para los lugares donde ya conversan',
      'Ayuda para decidir si seguir, cambiar algo o parar'
    ],
    consentText: 'Envíenme un email cuando First 30 abra. GhostTown usará este email solo para noticias de First 30 y puedo pedir que me borren en cualquier momento.',
    truthBoundary: 'Unirte a la lista es gratis y no compra nada. First 30 todavía no está a la venta.'
  },
  active: true
} as const;

// Founder decisions of 19 October 2026 (growth-engine harness/config/offer.yaml):
// free verdict, then First 30, then the year offered on day 26. Legal pages and
// offer copy read prices and refund rules from here so they cannot drift apart.
export const GHOSTTOWN_FIRST_30_V1 = {
  offerId: 'ghosttown_first_30_v1',
  version: '1.0',
  name: 'First 30',
  // Static default. The Worker reports 'on_sale' only when FIRST30_CHECKOUT_ENABLED is "true".
  status: 'opens_soon',
  priceUsd: 297,
  amountCents: 29700,
  currency: 'usd',
  stripePriceEnv: 'STRIPE_FIRST_30_PRICE_ID',
  displayPrice: '$297',
  durationDays: 30,
  includes: [
    'A daily plan for 30 days that adapts to what you learn',
    'A customer-acquisition website branded for your business, on a free web address',
    'The materials you need to reach your first customers, such as an offer, outreach messages, an interview guide, and an evidence tracker'
  ],
  includesEs: [
    'Un plan diario de 30 días que se adapta a lo que aprendes',
    'Un sitio web para conseguir clientes, con la marca de tu negocio, en una dirección web gratis',
    'Los materiales para llegar a tus primeros clientes, como una oferta, mensajes de contacto, una guía de entrevistas y un registro de evidencia'
  ],
  refundRule: 'Full refund until your website build starts; no refund after it starts.',
  refundRuleEs: 'Reembolso completo hasta que empiece la construcción de tu sitio web; sin reembolso después.',
  // The website build starts the first time the founder asks GhostTown to build their website preview.
  buildStartsWhen: 'the first time you ask GhostTown to build your website preview',
  buildStartsWhenEs: 'la primera vez que le pides a GhostTown que construya la vista previa de tu sitio web'
} as const;

export const GHOSTTOWN_YEAR_SQUARED_V1 = {
  offerId: 'ghosttown_year_squared_v1',
  name: 'Year Squared',
  offeredOnDay: 26,
  listPriceUsd: 2997,
  prepayUsd: 2497,
  installments: { count: 3, eachUsd: 999 },
  first30CreditUsd: 297,
  includes: [
    'A kickoff deep dive',
    'A map for your year',
    'Ongoing execution with GhostTown’s AI operating partner (your COO)',
    'A stress test and a report at each stage gate',
    'An operating playbook'
  ],
  includesEs: [
    'Una sesión inicial a fondo',
    'Un mapa para tu año',
    'Ejecución continua con el socio operativo de IA de GhostTown (tu COO)',
    'Una prueba de estrés y un informe en cada etapa',
    'Un manual de operaciones'
  ],
  refund: { fullRefundDays: 7, halfRefundThroughDay: 21 }
} as const;
