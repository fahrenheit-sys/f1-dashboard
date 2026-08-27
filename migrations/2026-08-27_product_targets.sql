-- 27 Aug 2026 — per-product split of the 1,200 opening-day target.
--
-- Percentages set by Avron: Hakoah One 10 · Lifestyle 50 · Fitness 25 ·
-- Wellness 5 · Teen 10. ("Signature" and "Base" in the source table are the
-- retired names for Lifestyle and Fitness.)
--
-- Before this, the product targets summed to 585 in the schema seed and 505 in
-- the code fallback, and neither matched any headline total.

UPDATE membership_products SET target_members = 120 WHERE slug = 'hakoah_one';
UPDATE membership_products SET target_members = 600 WHERE slug = 'lifestyle';
UPDATE membership_products SET target_members = 300 WHERE slug = 'fitness';
UPDATE membership_products SET target_members =  60 WHERE slug = 'wellness';
UPDATE membership_products SET target_members = 120 WHERE slug = 'teen';

-- Should return 1200, matching settings.target_total.
SELECT SUM(target_members) AS product_target_sum FROM membership_products;
