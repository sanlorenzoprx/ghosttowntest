PRAGMA foreign_keys = ON;

-- GhostTown 30-Day Sprint Learning Coach memory v1.
-- Daily model responses are durable/cached per exact execution context. Reusable
-- product-learning candidates are stored separately from customer evidence so
-- customer records never become global knowledge by accident.

CREATE TABLE IF NOT EXISTS execution_coach_responses (
  response_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 30),
  phase TEXT NOT NULL CHECK(phase IN ('plan', 'review', 'checkpoint', 'chat')),
  capability TEXT NOT NULL,
  context_sha256 TEXT NOT NULL,
  question_sha256 TEXT NOT NULL,
  response_json TEXT NOT NULL,
  receipt_json TEXT,
  degradation_json TEXT,
  cache_expires_at TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(account_id, blueprint_id, blueprint_version, day_number, phase, context_sha256, question_sha256),
  FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_execution_coach_responses_order_day
  ON execution_coach_responses(account_id, order_id, day_number, phase, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_coach_responses_cache
  ON execution_coach_responses(context_sha256, question_sha256, cache_expires_at);

CREATE TABLE IF NOT EXISTS execution_learning_candidates (
  candidate_id TEXT PRIMARY KEY,
  source_response_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 30),
  knowledge_class TEXT NOT NULL CHECK(knowledge_class IN ('human_behavior', 'strategy', 'tactic', 'market_research')),
  scope TEXT NOT NULL CHECK(scope IN ('universal', 'lane', 'market', 'customer_specific')),
  lane TEXT,
  lesson_text TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('low', 'medium', 'high')),
  evidence_basis TEXT NOT NULL,
  privacy_safe INTEGER NOT NULL CHECK(privacy_safe IN (0, 1)),
  global_eligible INTEGER NOT NULL CHECK(global_eligible IN (0, 1)),
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK(status IN ('candidate', 'promoted', 'rejected', 'superseded')),
  created_at TEXT NOT NULL,
  FOREIGN KEY(source_response_id) REFERENCES execution_coach_responses(response_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_execution_learning_candidates_class
  ON execution_learning_candidates(knowledge_class, scope, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_learning_candidates_account
  ON execution_learning_candidates(account_id, blueprint_id, blueprint_version, day_number);

CREATE TABLE IF NOT EXISTS execution_product_knowledge (
  knowledge_id TEXT PRIMARY KEY,
  knowledge_fingerprint TEXT NOT NULL UNIQUE,
  knowledge_class TEXT NOT NULL CHECK(knowledge_class IN ('human_behavior', 'strategy', 'tactic', 'market_research')),
  scope TEXT NOT NULL CHECK(scope IN ('universal', 'lane', 'market')),
  lane TEXT,
  lesson_text TEXT NOT NULL,
  evidence_summary_json TEXT NOT NULL,
  support_count INTEGER NOT NULL DEFAULT 0,
  contradiction_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'review_required' CHECK(status IN ('review_required', 'active', 'superseded', 'rejected')),
  valid_until TEXT,
  last_supported_at TEXT NOT NULL,
  next_review_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_product_knowledge_retrieval
  ON execution_product_knowledge(status, knowledge_class, scope, valid_until, last_supported_at DESC);
