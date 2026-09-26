-- Add do-not-rent status and note fields to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "doNotRent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "doNotRentNote" TEXT;
