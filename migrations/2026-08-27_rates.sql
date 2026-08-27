-- 27 Aug 2026 — repriced memberships. Rates are WEEKLY.
--
--   Hakoah One  $120/wk    (was $89/mo — now the highest rate, not the lowest)
--   Lifestyle   $100/wk    (was $149/mo)
--   Fitness      $70/wk    (was  $99/mo)
--   Wellness     $60/wk    (was  $79/mo)
--   Teen         $50/wk    (was  $49/mo)
--
-- weekly_rate is what a member is charged and the number to display.
-- monthly_rate keeps its meaning as the monthly equivalent (weekly x 52 / 12)
-- because every MRR figure on the dashboard is computed from it — putting a
-- weekly number in that column would understate MRR by 4.3x.

ALTER TABLE membership_products ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC(10,2);
ALTER TABLE leads               ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC(10,2);

UPDATE membership_products SET weekly_rate = 120 WHERE slug = 'hakoah_one';
UPDATE membership_products SET weekly_rate = 100 WHERE slug = 'lifestyle';
UPDATE membership_products SET weekly_rate =  70 WHERE slug = 'fitness';
UPDATE membership_products SET weekly_rate =  60 WHERE slug = 'wellness';
UPDATE membership_products SET weekly_rate =  50 WHERE slug = 'teen';

-- Monthly equivalent, derived so the two can never drift apart.
UPDATE membership_products
   SET monthly_rate = ROUND(weekly_rate * 52 / 12.0, 2)
 WHERE weekly_rate IS NOT NULL;

COMMENT ON COLUMN membership_products.weekly_rate  IS 'What a member is charged. Display this.';
COMMENT ON COLUMN membership_products.monthly_rate IS 'Monthly equivalent of weekly_rate (x52/12). Drives MRR. Not a price.';

-- Expect: weekly 105000, monthly 455000, annual 5460000.
SELECT SUM(weekly_rate  * target_members)      AS weekly_at_target,
       SUM(monthly_rate * target_members)      AS monthly_at_target,
       SUM(weekly_rate  * target_members) * 52 AS annual_at_target
  FROM membership_products;
