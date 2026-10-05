-- Websites you track. One row per site.
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  api_key TEXT NOT NULL,
  dodo_webhook_secret TEXT,
  created_at INTEGER NOT NULL
);

-- Anyone with a visitor cookie. Identity fields are filled by identify() or by a payment.
CREATE TABLE visitors (
  site_id TEXT NOT NULL,
  id TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  user_id TEXT,
  name TEXT,
  email TEXT,
  PRIMARY KEY (site_id, id)
);

-- A visit (30 minutes of inactivity ends it). Holds the attribution for that visit.
CREATE TABLE sessions (
  site_id TEXT NOT NULL,
  id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  hostname TEXT,
  entry_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  referrer_domain TEXT,
  source TEXT NOT NULL,
  channel TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ref TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  browser TEXT,
  os TEXT,
  device TEXT,
  PRIMARY KEY (site_id, id)
);
CREATE INDEX sessions_site_time ON sessions (site_id, started_at);
CREATE INDEX sessions_visitor ON sessions (site_id, visitor_id);

-- Pageviews, goals (custom events / button clicks) and outbound link clicks.
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  path TEXT,
  props TEXT
);
CREATE INDEX events_site_time ON events (site_id, ts);
CREATE INDEX events_session ON events (site_id, session_id);

-- Payments from Dodo Payments (webhook) or the generic payments API.
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  ts INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'payment', -- 'payment' or 'refund' (refunds are stored as negative amounts)
  currency TEXT NOT NULL,
  visitor_id TEXT,
  session_id TEXT,
  customer_id TEXT,
  email TEXT,
  name TEXT,
  renewal INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX payments_site_time ON payments (site_id, ts);
CREATE INDEX payments_customer ON payments (site_id, customer_id);

CREATE TABLE funnels (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  steps TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
