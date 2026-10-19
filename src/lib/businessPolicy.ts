export const BUSINESS_POLICY = {
  businessName: 'Zayas House LLC',
  jurisdiction: 'Commonwealth of Puerto Rico, USA',
  supportEmail: 'support@ghosttowntest.com',
  productName: 'Personalized 30-Day Idea-to-Evidence Implementation Plan',
  productPrice: '$97.00',
  refundPosition: 'Conditional 100% Money-Back Guarantee',
  refundCondition: 'To qualify for a full refund, the client must provide documented proof that they fully implemented the provided strategies, action steps, or deliverables and, despite full implementation, achieved no results.'
} as const;

// Facts the public policy pages use. The business identity table lives on /about.
export const LEGAL_POLICY = {
  operator: 'Zayas House LLC',
  jurisdiction: 'Commonwealth of Puerto Rico, USA',
  website: 'ghosttowntest.com',
  supportEmail: 'support@ghosttowntest.com',
  lastUpdated: 'October 19, 2026'
} as const;
