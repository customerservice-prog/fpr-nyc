-- Secure NYC saved-card authorization and replay-safe additional-charge ledger.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "cardSetupTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "cardSetupTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cardOnFileConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cardOnFileConsentIp" TEXT,
  ADD COLUMN IF NOT EXISTS "cardOnFileConsentVersion" TEXT;

CREATE TABLE IF NOT EXISTS "OrderAdditionalCharge" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'other',
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "stripePaymentIntentId" TEXT,
  "requestKey" TEXT,
  "addsToOrderTotal" BOOLEAN NOT NULL DEFAULT false,
  "consentVersion" TEXT,
  "consentAt" TIMESTAMP(3),
  "failureMessage" TEXT,
  "createdByName" TEXT,
  "customerNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderAdditionalCharge_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderAdditionalCharge_orderId_fkey') THEN
    ALTER TABLE "OrderAdditionalCharge"
      ADD CONSTRAINT "OrderAdditionalCharge_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "OrderAdditionalCharge_stripePaymentIntentId_key" ON "OrderAdditionalCharge"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrderAdditionalCharge_requestKey_key" ON "OrderAdditionalCharge"("requestKey");
CREATE INDEX IF NOT EXISTS "OrderAdditionalCharge_orderId_createdAt_idx" ON "OrderAdditionalCharge"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderAdditionalCharge_status_idx" ON "OrderAdditionalCharge"("status");
