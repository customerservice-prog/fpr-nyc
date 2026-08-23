-- Add setup surface, public park, and reference/lead-source fields to Order (ERS booking parity)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "setupSurface" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isPublicPark" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "referenceSource" TEXT;
