CREATE TABLE IF NOT EXISTS launch_blueprints (
  order_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_verdict_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL,
  blueprint_json TEXT NOT NULL,
  research_receipt_json TEXT NOT NULL,
  pdf_r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launch_blueprints_owner_updated
  ON launch_blueprints(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS launch_blueprint_progress (
  order_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  progress_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_blueprint_progress_owner
  ON launch_blueprint_progress(owner_id, updated_at DESC);
