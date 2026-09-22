ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutDraftKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutStage" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutLastSeenAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_checkoutDraftKey_key" ON "Order"("checkoutDraftKey");
