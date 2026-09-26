-- Add eventTimeSlot column to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "eventTimeSlot" TEXT;
