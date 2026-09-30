-- NYC multi-day rental pricing (2026-09-30): the same duration tiers as the live
-- Syracuse store (GET https://www.friendlypartyrental.com/api/pricing-tiers on
-- 2026-09-30). Each tier adds a percentage of the rental subtotal (NYC prices), so
-- a 2-day NYC rental costs 160% of the 1-day NYC price, exactly like Syracuse.
-- Inserted only when NYC has no tiers at all, so tiers edited later in
-- Admin > Settings > Pricing Tiers are never overwritten by a redeploy.
BEGIN;

INSERT INTO "PricingTier" ("id", "label", "minDays", "maxDays", "percent", "sortOrder", "createdAt", "updatedAt")
SELECT v."id", v."label", v."minDays", v."maxDays", v."percent", v."sortOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('nyc-duration-1-day', '1 Day', 1, 1::integer, 0::double precision, 0),
  ('nyc-duration-2-days', '2 Days', 2, 2, 60, 1),
  ('nyc-duration-3-days', '3 Days', 3, 3, 110, 2),
  ('nyc-duration-4-days', '4 Days', 4, 4, 145, 3),
  ('nyc-duration-5-days', '5 Days', 5, 5, 170, 4),
  ('nyc-duration-6-days', '6 Days', 6, 6, 188, 5),
  ('nyc-duration-7-days', '7 Days (1 Week)', 7, 7, 200, 6),
  ('nyc-duration-2-weeks', '2 Weeks', 8, 14, 400, 7),
  ('nyc-duration-3-weeks', '3 Weeks', 15, 21, 600, 8),
  ('nyc-duration-4-weeks', '4 Weeks (Monthly)', 22, 28, 800, 9),
  ('nyc-duration-29-plus-days', '29+ Days (Long-Term)', 29, NULL, 800, 10)
) AS v("id", "label", "minDays", "maxDays", "percent", "sortOrder")
WHERE NOT EXISTS (SELECT 1 FROM "PricingTier");

-- Aggregate count only in the deployment log.
DO $$
DECLARE
  tiers integer;
BEGIN
  SELECT COUNT(*) INTO tiers FROM "PricingTier";
  RAISE NOTICE 'NYC duration pricing tiers: %', tiers;
END $$;

COMMIT;
