-- First 30 includes the Get Me Live website in one payment. The website row is
-- created at purchase with entitlement_source = 'first30'. build_started_at is
-- stamped once, the first time the founder asks for the website preview; the
-- First 30 refund rule (full refund until the website build starts) reads it.
ALTER TABLE get_me_live_orders ADD COLUMN entitlement_source TEXT;
ALTER TABLE get_me_live_orders ADD COLUMN build_started_at TEXT;
