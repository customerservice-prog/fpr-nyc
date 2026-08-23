-- Add contract signature fields to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contractSignedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contractSignatureName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contractSignatureIp" TEXT;
