import { resolvePostVerdictOffer, type PostVerdictOffer } from './ghosttownOffer';

// Build-time switch for what follows a free verdict. Unset means the phase 1
// default: the First 30 email list. Set VITE_POST_VERDICT_OFFER=first30 to sell
// First 30, or =sprint to show the dormant $97 Sprint again.
export const ACTIVE_POST_VERDICT_OFFER: PostVerdictOffer = resolvePostVerdictOffer(import.meta.env.VITE_POST_VERDICT_OFFER);

export const SPRINT_OFFER_ACTIVE = ACTIVE_POST_VERDICT_OFFER === 'sprint';
// First 30 on sale. The Worker still refuses checkout unless FIRST30_CHECKOUT_ENABLED is "true".
export const FIRST30_OFFER_ACTIVE = ACTIVE_POST_VERDICT_OFFER === 'first30';
