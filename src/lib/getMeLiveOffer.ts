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
    'A live website on its own Cloudflare address first, with help connecting a domain you buy later',
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

const CLOUDFLARE_ACCOUNT_ID = /^[a-f0-9]{32}$/i;

/**
 * Cloudflare Registrar's "Register domain" page in the customer's own account.
 * Without a usable account ID, Cloudflare's account-picker deep link asks the
 * customer which account to use. Both paths checked by hand on 2026-10-01;
 * `/<account>/registrar/register` redirects to the owned-domains list instead.
 */
export function cloudflareRegistrarUrl(accountId?: string): string {
  const id = accountId?.trim();
  return id && CLOUDFLARE_ACCOUNT_ID.test(id)
    ? `https://dash.cloudflare.com/${id.toLowerCase()}/domains/registrations/purchase`
    : 'https://dash.cloudflare.com/?to=/:account/registrar/register';
}

/**
 * Up to `limit` `.com` ideas from business-name suggestions. GhostTown does not
 * check availability; Cloudflare confirms it and shows the current price.
 */
export function domainIdeas(names: string[], limit = 5): string[] {
  const ideas = names
    .map(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 52))
    .filter(label => label.length > 0)
    .map(label => `${label}.com`);
  return [...new Set(ideas)].slice(0, limit);
}
