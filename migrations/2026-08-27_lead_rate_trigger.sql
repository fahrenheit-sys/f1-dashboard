-- 27 Aug 2026 — populate a lead's rate from the membership they chose.
--
-- Nothing wrote a rate onto a lead, so MRR would have stayed $0 after the first
-- real sale. This derives it in the database rather than in application code,
-- matching how generation and tribe are already handled — the webhook, the Add
-- Lead form and a manual edit in Supabase all get the same answer.
--
-- Both columns are set together and neither is a substitute for the other:
--   weekly_rate  — what the member is charged. Display this.
--   monthly_rate — weekly x 52 / 12. Drives MRR. Never shown as a price.
-- Setting only weekly_rate would understate MRR by 4.3x while every label on
-- the dashboard still read "/mo".
--
-- Rates are written once and then left alone: a founding rate is locked at
-- signup, and a negotiated rate entered by hand must survive a later reprice.
-- To re-derive a lead deliberately, null its rates and touch the row.

CREATE OR REPLACE FUNCTION set_lead_rate_from_product()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.membership_interest IS NULL
     OR NEW.membership_interest = 'not_sure'
     OR (NEW.weekly_rate IS NOT NULL AND NEW.monthly_rate IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT weekly_rate, monthly_rate INTO p
    FROM membership_products
   WHERE slug = NEW.membership_interest;

  IF FOUND THEN
    NEW.weekly_rate  := COALESCE(NEW.weekly_rate,  p.weekly_rate);
    NEW.monthly_rate := COALESCE(NEW.monthly_rate, p.monthly_rate);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_rate ON leads;
CREATE TRIGGER trg_lead_rate
  BEFORE INSERT OR UPDATE OF membership_interest, membership_sold, stage ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_rate_from_product();

-- Backfill anything already captured.
UPDATE leads l
   SET weekly_rate  = p.weekly_rate,
       monthly_rate = p.monthly_rate
  FROM membership_products p
 WHERE p.slug = l.membership_interest
   AND l.membership_interest IS DISTINCT FROM 'not_sure'
   AND (l.weekly_rate IS NULL OR l.monthly_rate IS NULL);

-- Expect every lead with a real membership_interest to carry both rates.
SELECT membership_interest,
       COUNT(*)                                    AS leads,
       COUNT(weekly_rate)                          AS with_weekly,
       ROUND(AVG(weekly_rate), 2)                  AS weekly,
       ROUND(AVG(monthly_rate), 2)                 AS monthly_equiv
  FROM leads
 GROUP BY membership_interest
 ORDER BY membership_interest;
