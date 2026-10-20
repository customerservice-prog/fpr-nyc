-- NYC parity: durable customer-email delivery and staff sales alert audit.
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
CREATE UNIQUE INDEX IF NOT EXISTS "Order_emailDeliveryMessageId_key" ON "Order"("emailDeliveryMessageId");

CREATE TABLE IF NOT EXISTS "StaffEmailNotification" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "orderId" TEXT,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sending',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "provider" TEXT,
  "messageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffEmailNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StaffEmailNotification_eventKey_key" ON "StaffEmailNotification"("eventKey");
CREATE INDEX IF NOT EXISTS "StaffEmailNotification_status_createdAt_idx" ON "StaffEmailNotification"("status","createdAt");
CREATE INDEX IF NOT EXISTS "StaffEmailNotification_orderId_createdAt_idx" ON "StaffEmailNotification"("orderId","createdAt");
