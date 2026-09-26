CREATE TABLE IF NOT EXISTS "ItemExtra" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "costOfGoods" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemExtra_pkey" PRIMARY KEY ("id")
  );
CREATE UNIQUE INDEX IF NOT EXISTS "ItemExtra_itemId_key" ON "ItemExtra"("itemId");

CREATE TABLE IF NOT EXISTS "ScheduleProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "daysOfWeek" TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleProfile_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "BulkPricingRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minQuantity" INTEGER NOT NULL DEFAULT 2,
  "discountType" TEXT NOT NULL DEFAULT 'Percent',
  "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BulkPricingRule_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "Addon" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "AutoChargeSettings" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "daysBeforeEvent" INTEGER NOT NULL DEFAULT 3,
  "chargeRemainingBalance" BOOLEAN NOT NULL DEFAULT true,
  "notifyCustomer" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutoChargeSettings_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "RecurringProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'Monthly',
  "dayOfMonth" INTEGER,
  "dayOfWeek" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringProfile_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "RegisterSetup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegisterSetup_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "ProductSharingSetting" (
  "id" TEXT NOT NULL,
  "shareAcrossLocations" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSharingSetting_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "AutoChargeSettings" ("id","enabled","daysBeforeEvent","chargeRemainingBalance","notifyCustomer","updatedAt")
SELECT 'default_auto_charge', false, 3, true, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AutoChargeSettings");

INSERT INTO "ProductSharingSetting" ("id","shareAcrossLocations","notes","updatedAt")
SELECT 'default_product_sharing', false, 'Single location business - product sharing across locations is not applicable.', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ProductSharingSetting");

INSERT INTO "ScheduleProfile" ("id","name","description","daysOfWeek","isActive","createdAt")
SELECT 'sched_standard','Standard','Available all week','Mon,Tue,Wed,Thu,Fri,Sat,Sun',true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ScheduleProfile" WHERE id='sched_standard');

INSERT INTO "ScheduleProfile" ("id","name","description","daysOfWeek","isActive","createdAt")
SELECT 'sched_weekend','Weekend Only','Available Friday through Sunday','Fri,Sat,Sun',true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ScheduleProfile" WHERE id='sched_weekend');

INSERT INTO "RegisterSetup" ("id","name","location","isActive","createdAt")
SELECT 'register_main','Main Office Register','Syracuse, NY',true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RegisterSetup" WHERE id='register_main');

INSERT INTO "Addon" ("id","name","description","price","isActive","createdAt")
SELECT 'addon_setup_fee','Table & Chair Setup','Full setup of tables and chairs on site',1,true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Addon" WHERE id='addon_setup_fee');

INSERT INTO "BulkPricingRule" ("id","name","minQuantity","discountType","discountValue","isActive","createdAt")
SELECT 'bulk_10_percent','10% off 10+ items',10,'Percent',10,true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "BulkPricingRule" WHERE id='bulk_10_percent');
