-- 27 Aug 2026 — opening-day target confirmed at 1,200 founding members
-- (600 community + 600 local), per the July board deck. The database was
-- carrying 445 / 180 / 265, which no longer matches anything the business
-- is planning against.
--
-- The settings table had never been created in production, so the dashboard
-- was silently running on the code fallbacks in lib/config.ts — which is why
-- the numbers on screen could not be changed without a deploy. Creating it
-- here makes targets editable in the database, as intended.

CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  target_total     INTEGER NOT NULL DEFAULT 1200,
  target_community INTEGER NOT NULL DEFAULT 600,
  target_local     INTEGER NOT NULL DEFAULT 600,
  opening_date     DATE    NOT NULL DEFAULT '2027-04-15',
  CONSTRAINT settings_singleton CHECK (id = 1)
);

-- Single row, id = 1. Insert if absent, correct it if it somehow exists.
INSERT INTO settings (id, target_total, target_community, target_local, opening_date)
VALUES (1, 1200, 600, 600, '2027-04-15')
ON CONFLICT (id) DO UPDATE
   SET target_total     = EXCLUDED.target_total,
       target_community = EXCLUDED.target_community,
       target_local     = EXCLUDED.target_local;

-- Milestone targets tied to the same three numbers.
UPDATE milestones SET target_count = 600  WHERE stage_code = '4a';  -- Community founding members
UPDATE milestones SET target_count = 600  WHERE stage_code = '4b';  -- Local founding members
UPDATE milestones SET target_count = 1200 WHERE stage_code = '7';   -- Opening day

-- Expect: 1200 · 600 · 600 · 2027-04-15
SELECT target_total, target_community, target_local, opening_date FROM settings WHERE id = 1;
