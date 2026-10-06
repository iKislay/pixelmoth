-- Payment or subscription ids seen on your return/thank-you page (Dodo adds ?payment_id=... or
-- ?subscription_id=... to the return URL).
-- Lets a payment be linked to the visitor even when checkout metadata is missing.
CREATE TABLE payment_claims (
  site_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (site_id, payment_id)
);

-- How a payment was linked to its visitor: metadata, return_page, customer, email or timing.
ALTER TABLE payments ADD COLUMN matched_by TEXT;
ALTER TABLE payments ADD COLUMN subscription_id TEXT;
