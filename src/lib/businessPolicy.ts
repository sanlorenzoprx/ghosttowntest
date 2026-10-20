export const BUSINESS_POLICY = {
  businessName: 'Zayas House LLC',
  jurisdiction: 'Commonwealth of Puerto Rico, USA',
  supportEmail: 'support@ghosttownverdict.app',
  productName: 'Personalized 30-Day Idea-to-Evidence Implementation Plan',
  productPrice: '$97.00',
  refundPosition: 'Conditional 100% Money-Back Guarantee',
  refundCondition: 'To qualify for a full refund, the client must provide documented proof that they fully implemented the provided strategies, action steps, or deliverables and, despite full implementation, achieved no results.'
} as const;

// Facts the public policy pages use. The business identity table lives on /about.
export const LEGAL_POLICY = {
  operator: 'Zayas House LLC',
  jurisdiction: 'Commonwealth of Puerto Rico, USA',
  website: 'ghosttownverdict.app',
  formerWebsite: 'ghosttowntest.com',
  supportEmail: 'support@ghosttownverdict.app',
  lastUpdated: 'October 19, 2026',
  lastUpdatedEs: '19 de octubre de 2026',
  jurisdictionEs: 'Estado Libre Asociado de Puerto Rico, EE. UU.',
  // Postal address required in the footer of every First 30 list email
  // (CAN-SPAM). Kept off the website itself; written as the founder gave it.
  mailingAddress: ['BO QUEBRADA ONDA', 'CARR 181R 913 KM10', 'SAN LORENZO PR 00754']
} as const;
