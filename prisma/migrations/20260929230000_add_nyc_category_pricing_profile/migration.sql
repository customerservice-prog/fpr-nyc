-- The NYC Prisma schema already declares this field, but the inherited
-- migration history never added it. Full category reads otherwise fail P2022.
-- Preserve existing profiles if the column was provisioned previously.
-- This adds only the schema's existing default; no inventory costs, order
-- totals, service-area fees, customers or payments are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "pricingProfile" TEXT NOT NULL DEFAULT 'standard';
COMMIT;
