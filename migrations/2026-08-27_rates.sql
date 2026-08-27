-- 27 Aug 2026 — repriced membership rates.
--
--   Hakoah One  $89  -> $120     (now the highest rate, not the lowest)
--   Lifestyle   $149 -> $100
--   Fitness     $99  -> $70
--   Wellness    $79  -> $60
--   Teen        $49  -> $50
--
-- Monthly, matching the existing monthly_rate field and the $89/month the
-- GHL custom value has been quoting. Joining fees are unchanged.

UPDATE membership_products SET monthly_rate = 120 WHERE slug = 'hakoah_one';
UPDATE membership_products SET monthly_rate = 100 WHERE slug = 'lifestyle';
UPDATE membership_products SET monthly_rate =  70 WHERE slug = 'fitness';
UPDATE membership_products SET monthly_rate =  60 WHERE slug = 'wellness';
UPDATE membership_products SET monthly_rate =  50 WHERE slug = 'teen';

-- Monthly revenue at opening-day target: expect 105000.
SELECT SUM(monthly_rate * target_members) AS monthly_revenue_at_target
  FROM membership_products;
