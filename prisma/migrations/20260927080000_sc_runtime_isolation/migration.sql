-- South Carolina runtime isolation.
-- Repair only rows that are unmistakably Greenville/SC configuration copied with an NY label.
-- Customer and order records are intentionally not rewritten or deleted by this migration.

UPDATE "ServiceArea"
SET "state" = 'SC'
WHERE UPPER(TRIM("state")) IN ('NY', 'NEW YORK')
  AND "zip" ~ '^29[0-9]{3}$';

UPDATE "RegisterSetup"
SET "location" = 'Greenville, SC'
WHERE "id" = 'register_main'
  AND (
    "location" ILIKE '%Syracuse%'
    OR UPPER(TRIM(COALESCE("location", ''))) IN ('NY', 'NEW YORK')
  );
