CREATE TABLE IF NOT EXISTS get_me_live_orders (
  order_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_sprint_order_id TEXT NOT NULL,
  source_blueprint_id TEXT,
  offer_id TEXT NOT NULL,
  offer_version TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL,
  configuration_json TEXT,
  provider_state_json TEXT NOT NULL,
  preview_r2_key TEXT,
  public_url TEXT,
  custom_domain TEXT,
  deployment_receipt_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT,
  published_at TEXT,
  failure TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_get_me_live_source_sprint
  ON get_me_live_orders(source_sprint_order_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_get_me_live_owner_created
  ON get_me_live_orders(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS get_me_live_leads (
  lead_id TEXT PRIMARY KEY,
  get_me_live_order_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  consent_text TEXT NOT NULL,
  source_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_get_me_live_leads_order_created
  ON get_me_live_leads(get_me_live_order_id, created_at DESC);
