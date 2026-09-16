CREATE TABLE IF NOT EXISTS observed_evidence_events (
  event_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  evidence_class TEXT NOT NULL CHECK(evidence_class IN ('market', 'customer', 'commercial')),
  evidence_strength TEXT NOT NULL CHECK(evidence_strength IN ('weak', 'early', 'moderate', 'strong')),
  payload_sha256 TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  applied_at TEXT,
  FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_observed_evidence_order_occurred
  ON observed_evidence_events(order_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_observed_evidence_order_class
  ON observed_evidence_events(order_id, evidence_class, occurred_at DESC);
