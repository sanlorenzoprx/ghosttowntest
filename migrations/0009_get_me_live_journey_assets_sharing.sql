CREATE TABLE IF NOT EXISTS get_me_live_assets (
  asset_id TEXT PRIMARY KEY,
  get_me_live_order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('logo', 'photo', 'lead_magnet', 'social_image')),
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_main INTEGER NOT NULL DEFAULT 0,
  generated INTEGER NOT NULL DEFAULT 0,
  published_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_get_me_live_assets_order_position
  ON get_me_live_assets(get_me_live_order_id, kind, position);

CREATE TABLE IF NOT EXISTS get_me_live_share_drafts (
  draft_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_sprint_order_id TEXT NOT NULL,
  get_me_live_order_id TEXT,
  draft_type TEXT NOT NULL CHECK(draft_type IN ('sprint', 'launch', 'milestone_lead', 'milestone_sale')),
  position INTEGER NOT NULL DEFAULT 0,
  generated_text TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT,
  shared_at TEXT,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_get_me_live_share_drafts_order
  ON get_me_live_share_drafts(get_me_live_order_id, draft_type, position);
CREATE INDEX IF NOT EXISTS idx_get_me_live_share_drafts_sprint
  ON get_me_live_share_drafts(owner_id, source_sprint_order_id, draft_type, position);

CREATE TABLE IF NOT EXISTS get_me_live_activity_counts (
  get_me_live_order_id TEXT PRIMARY KEY,
  visit_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(get_me_live_order_id) REFERENCES get_me_live_orders(order_id) ON DELETE CASCADE
);
