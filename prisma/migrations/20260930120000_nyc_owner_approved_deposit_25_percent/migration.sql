-- Owner-approved NYC deposit (approved 2026-09-30): 25% of the order total is due
-- at online booking; the balance follows the rental terms (due before the event).
-- Inserted only when no active deposit rule exists, so a rule saved later in
-- Admin > Settings > Deposit Rules is never overwritten by a redeploy.
BEGIN;

INSERT INTO "DepositRule" ("id", "type", "amount", "isActive", "createdAt")
SELECT 'nyc-owner-approved-deposit-25-percent', 'percentage', 25, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "DepositRule" WHERE "isActive" = true);

-- Aggregate counts only (no personal data or secrets) in the deployment log.
DO $$
DECLARE
  active_rules integer;
BEGIN
  SELECT COUNT(*) INTO active_rules FROM "DepositRule" WHERE "isActive" = true;
  RAISE NOTICE 'NYC deposit rules: % active', active_rules;
END $$;

COMMIT;
