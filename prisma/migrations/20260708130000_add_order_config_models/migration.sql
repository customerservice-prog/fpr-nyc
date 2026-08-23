-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderSettings" (
    "id" TEXT NOT NULL,
    "requireDamageWaiver" BOOLEAN NOT NULL DEFAULT false,
    "allowOnlineOrders" BOOLEAN NOT NULL DEFAULT true,
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT true,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "defaultDepositPercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "allowPartialPayments" BOOLEAN NOT NULL DEFAULT true,
    "requirePhoneNumber" BOOLEAN NOT NULL DEFAULT true,
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 48,
    "reminderDaysBeforeDelivery" INTEGER NOT NULL DEFAULT 1,
    "reminderDaysBeforePickup" INTEGER NOT NULL DEFAULT 1,
    "reminderDaysBeforeBalance" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderSettings_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE IF NOT EXISTS "Reference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE IF NOT EXISTS "SetupSurface" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SetupSurface_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE IF NOT EXISTS "LoyaltyCreditType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Credit',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyCreditType_pkey" PRIMARY KEY ("id")
  );

-- Seed default OrderSettings row
INSERT INTO "OrderSettings" ("id", "updatedAt")
SELECT 'default_order_settings', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "OrderSettings");

-- Seed References
INSERT INTO "Reference" ("id", "name", "sortOrder") VALUES
('ref_google', 'Google Search', 1),
('ref_facebook', 'Facebook', 2),
('ref_instagram', 'Instagram', 3),
('ref_referral', 'Friend/Family Referral', 4),
('ref_repeat', 'Repeat Customer', 5),
('ref_other', 'Other', 6)
ON CONFLICT ("id") DO NOTHING;

-- Seed Setup Surfaces
INSERT INTO "SetupSurface" ("id", "name", "sortOrder") VALUES
('surf_grass', 'Grass', 1),
('surf_concrete', 'Concrete', 2),
('surf_asphalt', 'Asphalt', 3),
('surf_gravel', 'Gravel', 4),
('surf_indoor', 'Indoor', 5)
ON CONFLICT ("id") DO NOTHING;

-- Seed Loyalty & Credit Types
INSERT INTO "LoyaltyCreditType" ("id", "name", "type", "amount") VALUES
('loyalty_referral_credit', 'Referral Credit', 'Credit', 25),
('loyalty_repeat_discount', 'Repeat Customer Discount', 'Credit', 10),
('loyalty_points', 'Loyalty Points', 'Points', 1)
ON CONFLICT ("id") DO NOTHING;
