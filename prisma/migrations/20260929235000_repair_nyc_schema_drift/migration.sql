-- The NYC Prisma schema already declares these tables and columns, but the
-- inherited migration history never created them, so full reads of Order,
-- Driver, EmploymentApplication and Raincheck fail (P2022) and the
-- PricingTier / SpecialRequestFee tables are missing.
--
-- Additive only and safe to re-run: no existing column, row, price, order
-- total, customer or payment is changed or removed. New numeric columns use
-- the schema's own defaults; the two new tables start empty.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "rentalDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "durationLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "durationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "specialRequestFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "specialRequestNames" TEXT,
  ADD COLUMN IF NOT EXISTS "raincheckId" TEXT,
  ADD COLUMN IF NOT EXISTS "raincheckApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP(3);

ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "pin" TEXT;

ALTER TABLE "EmploymentApplication"
  ADD COLUMN IF NOT EXISTS "availability" TEXT,
  ADD COLUMN IF NOT EXISTS "experience" TEXT,
  ADD COLUMN IF NOT EXISTS "whyWorkWithUs" TEXT;

-- A raincheck issued before this column existed keeps its full value until it
-- is redeemed (new rainchecks are created with remainingAmount = amount).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Raincheck' AND column_name = 'remainingAmount'
  ) THEN
    ALTER TABLE "Raincheck" ADD COLUMN "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
    UPDATE "Raincheck" SET "remainingAmount" = "amount" WHERE "redeemedAt" IS NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PricingTier" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpecialRequestFee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialRequestFee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Driver_pin_key" ON "Driver"("pin");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_raincheckId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_raincheckId_fkey"
      FOREIGN KEY ("raincheckId") REFERENCES "Raincheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
