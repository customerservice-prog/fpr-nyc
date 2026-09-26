-- Add deliveryPhoto and pickupPhoto columns to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryPhoto" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupPhoto" TEXT;
