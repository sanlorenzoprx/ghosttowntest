import type { GetMeLiveOrder } from '../types/getMeLive';

export const GHOSTTOWN_GET_ME_LIVE_V1 = {
  offerId: 'ghosttown_get_me_live_v1',
  version: '1.0',
  name: 'Get Me Live',
  subtitle: 'Turn what you learned into a premium customer-ready test experience.',
  promise: 'Choose the name and look. GhostTown handles the setup, connections, testing, and launch.',
  customerPromise: [
    'An evidence-derived customer page built from your Sprint',
    'A guided name, style, offer, price, image, and call-to-action setup',
    'Preview and useful edits before anything is published',
    'Lead capture and tracking inside GhostTown',
    'Business email routing to the inbox you already use',
    'Domain search, connection, and registration guidance',
    'Optional Stripe Connect payment onboarding',
    'A tested Cloudflare deployment with a release receipt'
  ],
  scopeBoundary: 'Domain registration fees, Stripe processing fees, and third-party subscriptions are billed by their providers. GhostTown never promises sales or automatic payment eligibility.',
  referenceAmountCents: 29700,
  currency: 'usd',
  stripePriceEnv: 'STRIPE_GET_ME_LIVE_PRICE_ID',
  displayPriceEnv: 'VITE_GET_ME_LIVE_DISPLAY_PRICE',
  active: true
} as const;

export const DEFAULT_GET_ME_LIVE_DISPLAY_PRICE = '$297.00';

/**
 * The address customers should use for a Get Me Live site: the active, verified
 * custom domain when there is one, otherwise the stable Pages URL. A selected,
 * purchased, connecting, or failed custom domain never displaces the Pages URL.
 */
export function preferredPublicUrl(order: Pick<GetMeLiveOrder, 'hosting' | 'customDomainState'>): string | undefined {
  if (order.customDomainState?.status === 'active') return `https://${order.customDomainState.name}`;
  return order.hosting?.pagesUrl;
}
