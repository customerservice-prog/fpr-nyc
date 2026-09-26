-- Add marketing suppression fields to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "unsubscribedFromMarketing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "unsubscribedAt" TIMESTAMP(3);
