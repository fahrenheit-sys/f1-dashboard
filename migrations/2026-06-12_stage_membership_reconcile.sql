-- ============================================================
-- 2026-06-12 · Reconcile pipeline stages + membership types
-- ------------------------------------------------------------
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL).
-- Wrapped in a transaction: any failure rolls the whole thing back.
--
-- Changes:
--   1. Pipeline stages → the warm-up-to-drop model:
--        awareness · vip_waitlist · event_attended · tour_attended
--        · proposal · founding_member · member · withdrawn
--      (drops interest / nurture / qualified_lead / tour_booked / sold)
--   2. Membership types → Fitness / Wellness / Lifestyle / Teen / Hakoah One
--      ('signature' & 'comprehensive' → 'lifestyle'; Family & Corporate removed)
--
-- ORDER MATTERS: drop the old CHECK constraints FIRST, then migrate the
-- data to the new codes, then add the new constraints. (Migrating first
-- would trip the still-active old constraint.)
-- ============================================================

BEGIN;

-- ── 1. Drop the old CHECK constraints first ──────────────────
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND contype = 'c'
      AND (
        (pg_get_constraintdef(oid) ILIKE '%stage%' AND pg_get_constraintdef(oid) ILIKE '%awareness%')
        OR pg_get_constraintdef(oid) ILIKE '%membership_interest%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- ── 2. Migrate existing data to the new codes ────────────────
UPDATE public.leads SET stage = 'vip_waitlist'
  WHERE stage IN ('interest', 'nurture', 'qualified_lead');
UPDATE public.leads SET stage = 'event_attended'
  WHERE stage = 'tour_booked';
UPDATE public.leads SET stage = 'founding_member'
  WHERE stage = 'sold';

UPDATE public.leads SET membership_interest = 'lifestyle'
  WHERE membership_interest IN ('signature', 'comprehensive');
UPDATE public.leads SET membership_interest = 'not_sure'
  WHERE membership_interest IN ('family', 'corporate');

-- ── 3. Add the new CHECK constraints ─────────────────────────
ALTER TABLE public.leads
  ADD CONSTRAINT leads_stage_check CHECK (stage IN (
    'awareness', 'vip_waitlist', 'event_attended', 'tour_attended',
    'proposal', 'founding_member', 'member', 'withdrawn'
  ));

ALTER TABLE public.leads
  ADD CONSTRAINT leads_membership_interest_check CHECK (membership_interest IN (
    'hakoah_one', 'lifestyle', 'fitness', 'wellness', 'teen', 'not_sure'
  ));

-- ── 4. Reconcile the membership_products catalogue ───────────
UPDATE public.membership_products
  SET slug = 'lifestyle',
      name = 'Lifestyle',
      description = 'Gym + classes + recovery centre + wellness circuit + pool + pickleball + run club. 7 days.'
  WHERE slug = 'signature';

UPDATE public.membership_products
  SET description = 'Recovery Area + Wellness Circuit + Yoga + eGym. Mon–Fri 9am–5pm.'
  WHERE slug = 'wellness';

UPDATE public.membership_products
  SET description = 'Gym floor + group fitness. 7 days.'
  WHERE slug = 'fitness';

DELETE FROM public.membership_products WHERE slug IN ('family', 'corporate');

COMMIT;

-- ── Verify ───────────────────────────────────────────────────
-- SELECT DISTINCT stage FROM public.leads ORDER BY 1;
-- SELECT DISTINCT membership_interest FROM public.leads ORDER BY 1;
-- SELECT slug, name FROM public.membership_products ORDER BY target_members DESC;
