PRAGMA foreign_keys = ON;

-- GhostTown Daily Execution Log v1
-- Normalized, version-attached execution records. The canonical Launch Blueprint
-- remains immutable; regenerated plans must create a new blueprint_version row.

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blueprints (
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  account_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  canonical_source_hash TEXT NOT NULL,
  canonical_blueprint_sha256 TEXT,
  evidence_chain_path TEXT NOT NULL,
  generation_receipt_json TEXT NOT NULL,
  parent_blueprint_id TEXT,
  parent_blueprint_version TEXT,
  regeneration_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (blueprint_id, blueprint_version),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blueprints_account_created
  ON blueprints(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blueprints_order_version
  ON blueprints(order_id, blueprint_version);

CREATE TABLE IF NOT EXISTS blueprint_actions (
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  action_id TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 30),
  completion_key TEXT NOT NULL,
  action_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blueprint_id, blueprint_version, action_id),
  FOREIGN KEY(blueprint_id, blueprint_version)
    REFERENCES blueprints(blueprint_id, blueprint_version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blueprint_actions_day
  ON blueprint_actions(blueprint_id, blueprint_version, day_number);

CREATE TABLE IF NOT EXISTS action_progress (
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  action_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed')),
  note TEXT NOT NULL DEFAULT '',
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, blueprint_id, blueprint_version, action_id),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version, action_id)
    REFERENCES blueprint_actions(blueprint_id, blueprint_version, action_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  entry_revision_id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  action_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  contact_or_channel TEXT NOT NULL,
  action_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  customer_language TEXT NOT NULL,
  alternative_mentioned TEXT NOT NULL,
  objection TEXT NOT NULL,
  commitment_offered TEXT NOT NULL,
  commitment_received TEXT NOT NULL,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  founder_minutes INTEGER NOT NULL DEFAULT 0,
  variable_cost_cents INTEGER NOT NULL DEFAULT 0,
  follow_up_date TEXT,
  source_note TEXT NOT NULL,
  UNIQUE(entry_id, content_sha256),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version, action_id)
    REFERENCES blueprint_actions(blueprint_id, blueprint_version, action_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_blueprint_recorded
  ON journal_entries(account_id, blueprint_id, blueprint_version, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_follow_up
  ON journal_entries(account_id, follow_up_date);

CREATE TABLE IF NOT EXISTS journal_evidence (
  evidence_id TEXT PRIMARY KEY,
  entry_revision_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  action_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  evidence_strength TEXT NOT NULL CHECK(evidence_strength IN ('strong', 'moderate', 'early', 'weak')),
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(entry_revision_id) REFERENCES journal_entries(entry_revision_id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_evidence_checkpoint
  ON journal_evidence(blueprint_id, blueprint_version, checkpoint_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reminder_preferences (
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  daily_action INTEGER NOT NULL DEFAULT 1 CHECK(daily_action IN (0, 1)),
  follow_ups INTEGER NOT NULL DEFAULT 1 CHECK(follow_ups IN (0, 1)),
  checkpoints INTEGER NOT NULL DEFAULT 1 CHECK(checkpoints IN (0, 1)),
  preferred_hour_local INTEGER NOT NULL DEFAULT 9 CHECK(preferred_hour_local BETWEEN 0 AND 23),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, blueprint_id, blueprint_version),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version)
    REFERENCES blueprints(blueprint_id, blueprint_version) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  reminder_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('daily_action', 'follow_up', 'checkpoint')),
  due_at TEXT NOT NULL,
  action_id TEXT,
  entry_id TEXT,
  checkpoint_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'done', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version)
    REFERENCES blueprints(blueprint_id, blueprint_version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_due
  ON scheduled_reminders(account_id, status, due_at);

CREATE TABLE IF NOT EXISTS checkpoint_reviews (
  review_revision_id TEXT PRIMARY KEY,
  content_sha256 TEXT NOT NULL,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK(day_number IN (7, 14, 21, 30)),
  completed_at TEXT NOT NULL,
  review_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  UNIQUE(account_id, blueprint_id, blueprint_version, checkpoint_id, content_sha256),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version)
    REFERENCES blueprints(blueprint_id, blueprint_version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_reviews_blueprint_day
  ON checkpoint_reviews(blueprint_id, blueprint_version, day_number, recorded_at DESC);

CREATE TABLE IF NOT EXISTS acs_readiness_assessments (
  assessment_id TEXT PRIMARY KEY,
  content_sha256 TEXT NOT NULL,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  eligible INTEGER NOT NULL CHECK(eligible IN (0, 1)),
  reason_codes_json TEXT NOT NULL,
  assessment_json TEXT NOT NULL,
  governance_status TEXT NOT NULL DEFAULT 'recommendation_only'
    CHECK(governance_status = 'recommendation_only'),
  assessed_at TEXT NOT NULL,
  UNIQUE(account_id, blueprint_id, blueprint_version, content_sha256),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY(blueprint_id, blueprint_version)
    REFERENCES blueprints(blueprint_id, blueprint_version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_acs_readiness_blueprint
  ON acs_readiness_assessments(account_id, blueprint_id, blueprint_version, assessed_at DESC);
