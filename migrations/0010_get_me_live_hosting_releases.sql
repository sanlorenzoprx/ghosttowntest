ALTER TABLE get_me_live_orders ADD COLUMN hosting_json TEXT;
ALTER TABLE get_me_live_orders ADD COLUMN custom_domain_json TEXT;

CREATE TABLE IF NOT EXISTS get_me_live_releases (
  release_id TEXT PRIMARY KEY,
  get_me_live_order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('launch', 'republish', 'domain_activation')),
  build_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  deployment_url TEXT,
  pages_url TEXT NOT NULL,
  custom_domain TEXT,
  verified_url TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  backfilled INTEGER NOT NULL DEFAULT 0,
  receipt_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_get_me_live_releases_order_created
  ON get_me_live_releases(get_me_live_order_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_get_me_live_releases_one_launch
  ON get_me_live_releases(get_me_live_order_id) WHERE kind = 'launch';

CREATE TABLE IF NOT EXISTS get_me_live_publish_attempts (
  get_me_live_order_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('launch', 'republish', 'domain_activation')),
  build_id TEXT NOT NULL,
  custom_domain TEXT,
  phase TEXT NOT NULL CHECK(phase IN ('claimed', 'deployed')),
  deployment_id TEXT,
  deployment_url TEXT,
  claimed_at TEXT NOT NULL,
  deployed_at TEXT,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);
