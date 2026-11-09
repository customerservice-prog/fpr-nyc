-- NYC inventory attestation ledger, kept separate from Syracuse catalog synchronization.
CREATE TABLE "NycPhysicalStockVerification" (
  "itemSlug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unverified',
  "verifiedQuantity" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'unknown',
  "notes" TEXT,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NycPhysicalStockVerification_pkey" PRIMARY KEY ("itemSlug"),
  CONSTRAINT "NycPhysicalStockVerification_quantity_check" CHECK ("verifiedQuantity" >= 0),
  CONSTRAINT "NycPhysicalStockVerification_status_check" CHECK ("status" IN ('unverified','confirmed','unavailable')),
  CONSTRAINT "NycPhysicalStockVerification_source_check" CHECK ("source" IN ('nyc_stock','partner_committed','unknown'))
);
CREATE INDEX "NycPhysicalStockVerification_status_idx" ON "NycPhysicalStockVerification"("status");
CREATE INDEX "NycPhysicalStockVerification_verifiedAt_idx" ON "NycPhysicalStockVerification"("verifiedAt");