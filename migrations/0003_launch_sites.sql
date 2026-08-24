CREATE TABLE IF NOT EXISTS launch_sites (
  site_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  public_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'unpublished')),
  published_at TEXT,
  unpublished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_sites_owner_updated
  ON launch_sites(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_launch_sites_public_status
  ON launch_sites(public_slug, status);

CREATE TABLE IF NOT EXISTS launch_site_leads (
  lead_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT,
  source_path TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(site_id) REFERENCES launch_sites(site_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_site_leads_site_created
  ON launch_site_leads(site_id, created_at DESC);
