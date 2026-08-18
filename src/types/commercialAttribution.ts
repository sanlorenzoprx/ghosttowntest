export type CommercialShareType = 'factory' | 'customer' | 'earned';

export type CommercialEventName =
  | 'landing_viewed'
  | 'qualified_click'
  | 'verdict_started'
  | 'verdict_completed'
  | 'paid_plan_viewed'
  | 'checkout_started'
  | 'download_clicked'
  | 'blueprint_opened'
  | 'daily_packet_opened'
  | 'day_completed'
  | 'evidence_recorded'
  | 'blueprint_retry_requested';

export interface CommercialAttributionEnvelope {
  schemaVersion: 'ghosttown-commercial-attribution-v1';
  attributionToken: string;
  visitorId: string;
  ghosttownSessionId: string;
  firstTouchAt: string;
  lastTouchAt: string;
  experimentId?: string;
  sourceVerdictId?: string;
  creativeId?: string;
  publicationId?: string;
  platform?: string;
  accountId?: string;
  campaign?: string;
  source?: string;
  shareType?: CommercialShareType;
  verdictId?: string;
}

export interface CommercialEventContext {
  orderId?: string;
  verdictId?: string;
  content?: string;
  dedupeKey?: string;
}
