CREATE TABLE IF NOT EXISTS runtime_rate_limits (
  scope TEXT NOT NULL,
  window_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  expires_at TEXT NOT NULL,
  PRIMARY KEY (scope, window_key)
);

CREATE INDEX IF NOT EXISTS idx_runtime_rate_limits_expires_at
  ON runtime_rate_limits(expires_at);
