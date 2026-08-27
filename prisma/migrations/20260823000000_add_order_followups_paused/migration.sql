-- Allow staff to manually pause automated quote follow-up emails for a specific order,
-- e.g. after the customer has replied. There is no inbound-email/reply-detection
-- infrastructure in this app, so this is a manual interim control until that exists.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "followUpsPaused" BOOLEAN NOT NULL DEFAULT false;
