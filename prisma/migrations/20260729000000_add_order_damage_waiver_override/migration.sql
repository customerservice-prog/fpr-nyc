-- Add overrideDamageWaiverFee to Order for ERS-parity damage waiver overrides
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "overrideDamageWaiverFee" DOUBLE PRECISION;
