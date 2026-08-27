-- ============================================================
-- FAHRENHEIT ONE @ HAKOAH PADDINGTON
-- Supabase Database Schema
-- ============================================================

-- LEADS table — every prospect entering the pipeline
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identity
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT,

  -- Segmentation (captured at opt-in)
  -- Canonical set mirrors the membership_products catalog (+ not_sure).
  -- 'signature'/'comprehensive' were merged into 'lifestyle'; family/corporate
  -- dropped (see migrations/2026-06-12_stage_membership_reconcile.sql).
  membership_interest TEXT CHECK (membership_interest IN ('hakoah_one','lifestyle','fitness','wellness','teen','not_sure')),
  preferred_time TEXT CHECK (preferred_time IN ('early_morning','mid_morning','lunchtime','afternoon','evening','weekends')),
  year_of_birth INTEGER,

  -- Derived fields (auto-calculated)
  generation TEXT CHECK (generation IN ('gen_z','millennial','gen_x','boomer','silent_gen','gen_alpha')),
  tribe TEXT CHECK (tribe IN ('early_bird','am_achiever','lunch_legends','afternoon','pm_warrior','weekend_warrior')),

  -- Track
  track TEXT DEFAULT 'community' CHECK (track IN ('community','local')),
  is_hakoah_member BOOLEAN DEFAULT FALSE,

  -- Pipeline stage
  -- Warm-up-to-drop funnel (see CONTEXT §9). Community uses awareness →
  -- vip_waitlist → event_attended → proposal → founding_member → member;
  -- Local inserts tour_attended after event_attended. withdrawn = refunded/lost.
  stage TEXT DEFAULT 'awareness' CHECK (stage IN (
    'awareness','vip_waitlist','event_attended','tour_attended',
    'proposal','founding_member','member','withdrawn'
  )),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Marketing source
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  lead_source TEXT CHECK (lead_source IN (
    'hakoah_newsletter','meta_paid','google_search','google_display',
    'organic_social','referral','walk_in','event','hoarding_qr',
    'pr_editorial','corporate_partnership','community_partnership',
    'website_direct','other'
  )),
  referral_source TEXT,

  -- Sales
  assigned_to TEXT,
  contact_attempts INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  tour_booked_at TIMESTAMPTZ,
  tour_attended_at TIMESTAMPTZ,
  proposal_sent_at TIMESTAMPTZ,

  -- Conversion
  membership_sold BOOLEAN DEFAULT FALSE,
  membership_sold_at TIMESTAMPTZ,
  membership_type TEXT,
  monthly_rate NUMERIC(10,2),   -- monthly equivalent of weekly_rate; drives MRR
  weekly_rate  NUMERIC(10,2),   -- what a member is actually charged
  join_fee NUMERIC(10,2),

  -- GHL
  ghl_contact_id TEXT UNIQUE,
  ghl_opportunity_id TEXT,

  -- Meta
  notes TEXT,
  tags TEXT[]
);

-- MEMBERSHIP PRODUCTS table
CREATE TABLE membership_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  track TEXT CHECK (track IN ('community','local','both')),
  monthly_rate NUMERIC(10,2),
  join_fee NUMERIC(10,2),
  is_founding BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  target_members INTEGER,
  description TEXT
);

-- SETTINGS — single-row dashboard config (opening-day targets + date).
-- Read by the dashboard via lib/config.ts; edit the row in the Table Editor.
-- The dashboard falls back to these same defaults if the table is absent.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  target_total INTEGER NOT NULL DEFAULT 1200,
  target_community INTEGER NOT NULL DEFAULT 600,
  target_local INTEGER NOT NULL DEFAULT 600,
  opening_date DATE NOT NULL DEFAULT '2027-04-15',
  CONSTRAINT settings_singleton CHECK (id = 1)
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- PIPELINE EVENTS — audit log of every stage change
CREATE TABLE pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT,
  changed_by TEXT,
  notes TEXT
);

-- MARKETING SPEND — weekly channel spend for ROAS calculation
CREATE TABLE marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_starting DATE NOT NULL,
  channel TEXT NOT NULL,
  track TEXT CHECK (track IN ('community','local','both')),
  spend NUMERIC(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  notes TEXT
);

-- CAMPAIGN MILESTONES
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage_code TEXT,
  track TEXT,
  target_date DATE,
  actual_date DATE,
  target_count INTEGER,
  notes TEXT
);

-- SALES CONSULTANTS
CREATE TABLE consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE
);

-- GHL WEBHOOK LOG — raw inbound payloads
CREATE TABLE ghl_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  lead_id UUID REFERENCES leads(id)
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_leads_track ON leads(track);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_generation ON leads(generation);
CREATE INDEX idx_leads_tribe ON leads(tribe);
CREATE INDEX idx_leads_membership_interest ON leads(membership_interest);
CREATE INDEX idx_leads_lead_source ON leads(lead_source);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_membership_sold ON leads(membership_sold);
CREATE INDEX idx_pipeline_events_lead_id ON pipeline_events(lead_id);
CREATE INDEX idx_ghl_webhook_processed ON ghl_webhook_log(processed);

-- ── AUTO-CALCULATE generation from year_of_birth ──────────
CREATE OR REPLACE FUNCTION calculate_generation(yob INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF yob IS NULL THEN RETURN NULL; END IF;
  IF yob >= 2010 THEN RETURN 'gen_alpha';
  ELSIF yob >= 1997 THEN RETURN 'gen_z';
  ELSIF yob >= 1981 THEN RETURN 'millennial';
  ELSIF yob >= 1965 THEN RETURN 'gen_x';
  ELSIF yob >= 1946 THEN RETURN 'boomer';
  ELSE RETURN 'silent_gen';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── AUTO-CALCULATE tribe from preferred_time ──────────────
CREATE OR REPLACE FUNCTION calculate_tribe(ptime TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE ptime
    WHEN 'early_morning' THEN RETURN 'early_bird';
    WHEN 'mid_morning'   THEN RETURN 'am_achiever';
    WHEN 'lunchtime'     THEN RETURN 'lunch_legends';
    WHEN 'afternoon'     THEN RETURN 'afternoon';
    WHEN 'evening'       THEN RETURN 'pm_warrior';
    WHEN 'weekends'      THEN RETURN 'weekend_warrior';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGER: auto-set generation + tribe on insert/update ─
CREATE OR REPLACE FUNCTION set_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.generation := calculate_generation(NEW.year_of_birth);
  NEW.tribe      := calculate_tribe(NEW.preferred_time);
  NEW.updated_at := NOW();
  IF NEW.stage <> OLD.stage THEN
    NEW.stage_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_derived_fields
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_derived_fields();

-- ── TRIGGER: log pipeline stage changes ───────────────────
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO pipeline_events(lead_id, from_stage, to_stage)
    VALUES (NEW.id, OLD.stage, NEW.stage);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_stage_change
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();

-- ── SEED: membership products ─────────────────────────────
INSERT INTO membership_products (name, slug, track, monthly_rate, join_fee, is_founding, target_members, description) VALUES
('Hakoah One',    'hakoah_one',    'community', 120,  199, TRUE,  120, 'Founding community membership — pre-opening exclusive'),
('Lifestyle',     'lifestyle',     'both',      100, 299, FALSE, 600, 'Gym + classes + recovery centre + wellness circuit + pool + pickleball + run club. 7 days.'),
('Fitness',       'fitness',       'both',      70,  199, FALSE, 300, 'Gym floor + group fitness. 7 days.'),
('Wellness',      'wellness',      'both',      60,  149, FALSE, 60,  'Recovery Area + Wellness Circuit + Yoga + eGym. Mon–Fri 9am–5pm.'),
('Teen',          'teen',          'both',      50,  99,  FALSE, 120,  'Age 14+: eGym + supervised training. Afternoons + weekends.');

-- ── SEED: milestones ──────────────────────────────────────
INSERT INTO milestones (name, stage_code, track, target_date, target_count) VALUES
('Community Awareness Launch',    '1a', 'community', '2026-06-01', NULL),
('Community Interest — 200 leads','2a', 'community', '2026-07-31', 200),
('Community VIP List — 150',      '3a', 'community', '2026-08-31', 150),
('Community Membership Drop',     '4a', 'community', '2026-09-15', NULL),
('Community Founding Members',    '4a', 'community', '2026-09-30', 600),
('Local Awareness Launch',        '1b', 'local',     '2026-11-01', NULL),
('Local Interest — 400 leads',    '2b', 'local',     '2026-12-31', 400),
('Local VIP List — 200',          '3b', 'local',     '2027-01-31', 200),
('Local Membership Drop',         '4b', 'local',     '2027-02-15', NULL),
('Local Founding Members',        '4b', 'local',     '2027-02-28', 600),
('Early Access',                  '6',  'both',      '2027-04-01', NULL),
('Opening Day',                   '7',  'both',      '2027-04-15', 1200);

-- ============================================================
-- MIGRATIONS — one-time scripts for databases created before a
-- schema change. The CREATE statements above already reflect the
-- final shape for fresh installs; run these to bring an existing
-- database up to date. Safe to re-run (idempotent / guarded).
-- ============================================================

-- 2026-06-12 · Reconcile membership taxonomy + pipeline stages.
-- This block mirrors migrations/2026-06-12_stage_membership_reconcile.sql so a
-- top-to-bottom run of this schema file lands on the final shape. For an
-- already-live DB, run that standalone migration file instead.
-- ORDER MATTERS: drop old constraints first, then migrate data, then re-add.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%membership_interest%'
           OR (pg_get_constraintdef(oid) ILIKE '%stage%'
               AND pg_get_constraintdef(oid) ILIKE '%awareness%'))
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.leads SET stage = 'vip_waitlist'
  WHERE stage IN ('interest','nurture','qualified_lead');
UPDATE public.leads SET stage = 'event_attended' WHERE stage = 'tour_booked';
UPDATE public.leads SET stage = 'founding_member' WHERE stage = 'sold';

UPDATE public.leads SET membership_interest = 'lifestyle'
  WHERE membership_interest IN ('signature','comprehensive');
UPDATE public.leads SET membership_interest = 'not_sure'
  WHERE membership_interest IN ('family','corporate');

ALTER TABLE public.leads
  ADD CONSTRAINT leads_membership_interest_check
  CHECK (membership_interest IN
    ('hakoah_one','lifestyle','fitness','wellness','teen','not_sure'));

ALTER TABLE public.leads
  ADD CONSTRAINT leads_stage_check
  CHECK (stage IN
    ('awareness','vip_waitlist','event_attended','tour_attended',
     'proposal','founding_member','member','withdrawn'));

-- 2026-06 · Settings table (no-op if it already exists; the CREATE above is the
-- canonical version). Included here so existing databases get it too.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  target_total INTEGER NOT NULL DEFAULT 1200,
  target_community INTEGER NOT NULL DEFAULT 600,
  target_local INTEGER NOT NULL DEFAULT 600,
  opening_date DATE NOT NULL DEFAULT '2027-04-15',
  CONSTRAINT settings_singleton CHECK (id = 1)
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
