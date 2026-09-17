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
  | 'blueprint_retry_requested'
  | 'get_me_live_offer_viewed'
  | 'get_me_live_cta_clicked'
  | 'get_me_live_checkout_started'
  | 'get_me_live_purchase_completed'
  | 'get_me_live_setup_started'
  | 'get_me_live_preview_created'
  | 'get_me_live_publish_clicked'
  | 'get_me_live_live_completed'
  | 'get_me_live_lead_captured'
  | 'get_me_live_payment_connected'
  | 'get_me_live_customer_payment';

export interface CommercialAttributionTouch {
  capturedAt: string;
  experimentId?: string;
  sourceVerdictId?: string;
  creativeId?: string;
  publicationId?: string;
  platform?: string;
  accountId?: string;
  campaign?: string;
  source?: string;
  shareType?: CommercialShareType;
}

export interface CommercialAttributionEnvelope {
  schemaVersion: 'ghosttown-commercial-attribution-v1';
  attributionToken: string;
  visitorId: string;
  ghosttownSessionId: string;
  firstTouchAt: string;
  lastTouchAt: string;
  /** Compatibility projection of firstTouch for existing Story Studio joins. */
  experimentId?: string;
  sourceVerdictId?: string;
  creativeId?: string;
  publicationId?: string;
  platform?: string;
  accountId?: string;
  campaign?: string;
  source?: string;
  shareType?: CommercialShareType;
  firstTouch: CommercialAttributionTouch;
  lastTouch: CommercialAttributionTouch;
  verdictId?: string;
}

export interface CommercialEventContext {
  orderId?: string;
  verdictId?: string;
  content?: string;
  dedupeKey?: string;
}
