CREATE TABLE IF NOT EXISTS launch_blueprint_identity_reservations (
  order_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_verdict_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
