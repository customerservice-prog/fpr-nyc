-- CreateTable
CREATE TABLE "Driver" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "vehicleInfo" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
  );

-- Add driver assignment and routing fields to Order
ALTER TABLE "Order" ADD COLUMN "driverId" TEXT;
ALTER TABLE "Order" ADD COLUMN "pickupDriverId" TEXT;
ALTER TABLE "Order" ADD COLUMN "routeSequence" INTEGER;
ALTER TABLE "Order" ADD COLUMN "pickupRouteSequence" INTEGER;

-- Add product status/attention fields to Item
ALTER TABLE "Item" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Available';
ALTER TABLE "Item" ADD COLUMN "attentionNotes" TEXT;
ALTER TABLE "Item" ADD COLUMN "lastInspectedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupDriverId_fkey" FOREIGN KEY ("pickupDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
