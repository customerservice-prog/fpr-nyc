-- AlterTable: add delivery/pickup scheduling fields to Order
ALTER TABLE "Order" ADD COLUMN "eventStartTime" TEXT;
ALTER TABLE "Order" ADD COLUMN "eventEndTime" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryWindowStart" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryWindowEnd" TEXT;
ALTER TABLE "Order" ADD COLUMN "exactDeliveryRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "exactDeliveryTime" TEXT;
ALTER TABLE "Order" ADD COLUMN "exactDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "pickupType" TEXT NOT NULL DEFAULT 'flexible';
ALTER TABLE "Order" ADD COLUMN "pickupRequiredByTime" TEXT;
ALTER TABLE "Order" ADD COLUMN "exactPickupTime" TEXT;
ALTER TABLE "Order" ADD COLUMN "exactPickupFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "latePickupApprovalRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExactTimeSlot" (
      "id" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "time" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "capacity" INTEGER NOT NULL DEFAULT 1,
      "bookedCount" INTEGER NOT NULL DEFAULT 0,
      "isBlocked" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExactTimeSlot_pkey" PRIMARY KEY ("id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "ExactTimeSlot_date_time_type_key" ON "ExactTimeSlot"("date", "time", "type");

-- CreateTable
CREATE TABLE "ExactTimeSettings" (
      "id" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "startHour" INTEGER NOT NULL DEFAULT 9,
      "endHour" INTEGER NOT NULL DEFAULT 20,
      "defaultCapacityPerSlot" INTEGER NOT NULL DEFAULT 1,
      "exactDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "eveningFee1" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "eveningFee2" DOUBLE PRECISION NOT NULL DEFAULT 75,
      "lateNightFee" DOUBLE PRECISION NOT NULL DEFAULT 125,
      "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExactTimeSettings_pkey" PRIMARY KEY ("id")
  );
