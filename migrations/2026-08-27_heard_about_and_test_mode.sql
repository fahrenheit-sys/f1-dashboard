-- 27 Aug 2026 — two additions. Safe to run more than once.
--
-- 1. heard_about — the raw answer to "How did you hear about us?", captured on
--    all three pages from today. lead_source carries the normalised enum the
--    charts read; this keeps the verbatim answer, because the enum collapses
--    distinctions worth seeing — "saw a billboard" and "walked past" both map
--    to hoarding_qr, and only the raw answer says which one is working.
--
-- 2. is_test — separates test submissions from real leads so the dashboard can
--    show honest numbers. Every row that exists today is test data, so the
--    backfill marks them all; anything arriving from now on is live unless the
--    webhook flags it.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS heard_about TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN leads.heard_about IS
  'Raw answer to "How did you hear about us?" — verbatim. See lead_source for the charted enum.';
COMMENT ON COLUMN leads.is_test IS
  'True for internal test submissions. The dashboard hides these unless test mode is on.';

-- Everything captured before today was a test. Runs once: after this the
-- column is no longer NULL anywhere, so re-running changes nothing.
UPDATE leads
   SET is_test = TRUE
 WHERE created_at < '2026-08-27T00:00:00Z'
   AND is_test IS DISTINCT FROM TRUE;

CREATE INDEX IF NOT EXISTS leads_is_test_idx     ON leads (is_test);
CREATE INDEX IF NOT EXISTS leads_heard_about_idx ON leads (heard_about);
