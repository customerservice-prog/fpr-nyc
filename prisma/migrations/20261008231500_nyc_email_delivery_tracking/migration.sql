ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "emailDeliveryProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliveryMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliveryStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliveryRecipient" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliverySubject" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliveryLastEvent" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliveryDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDeliverySentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailDeliveryUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_emailDeliveryMessageId_key"
  ON "Order"("emailDeliveryMessageId");
