-- 27 Aug 2026 — opening-day target confirmed at 1,200 founding members
-- (600 community + 600 local), per the July board deck. The database was
-- still carrying 445 / 180 / 265, which no longer matches anything the
-- business is planning against.
--
-- The dashboard reads these from Supabase and only falls back to code, so
-- this migration — not the code — is what changes the numbers on screen.

UPDATE settings
   SET target_total     = 1200,
       target_community = 600,
       target_local     = 600
 WHERE id = 1;

-- Milestone targets tied to the same three numbers.
UPDATE milestones SET target_value = 600  WHERE stage = '4a';  -- Community founding members
UPDATE milestones SET target_value = 600  WHERE stage = '4b';  -- Local founding members
UPDATE milestones SET target_value = 1200 WHERE stage = '7';   -- Opening day

-- Check the result.
SELECT target_total, target_community, target_local, opening_date FROM settings WHERE id = 1;
