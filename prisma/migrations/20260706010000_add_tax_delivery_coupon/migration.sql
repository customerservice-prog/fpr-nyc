-- Add TaxRate table
CREATE TABLE IF NOT EXISTS "TaxRate" (
    "id" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
  );

-- Add new columns to Category for booking-availability blocks
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bookableAfter" TIMESTAMP(3);
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bookableAfterMessage" TEXT;

-- Add new columns to Order for delivery fee, tax rate, coupon, damage waiver
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryDistance" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "damageWaiver" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "damageWaiverFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
