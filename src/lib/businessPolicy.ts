export const BUSINESS_POLICY = {
  businessName: 'Zayas House LLC',
  jurisdiction: 'Commonwealth of Puerto Rico, USA',
  supportEmail: 'support@ghosttowntest.com',
  productName: 'Personalized 30-Day Idea-to-Evidence Implementation Plan',
  productPrice: '$97.00',
  refundPosition: 'Conditional 100% Money-Back Guarantee',
  refundCondition: 'To qualify for a full refund, the client must provide documented proof that they fully implemented the provided strategies, action steps, or deliverables and, despite full implementation, achieved no results.'
} as const;

// Public policy facts for rollout phase 1, when the free verdict is live and the
// $97 Sprint is dormant. The Sprint policy above returns with the Sprint offer.
export const FREE_VERDICT_POLICY = {
  productName: 'GhostTown free verdict',
  productPrice: 'Free. Optional pack of 10 more verdicts for $14.95, one-time; no subscription',
  lastUpdated: 'October 19, 2026'
} as const;
