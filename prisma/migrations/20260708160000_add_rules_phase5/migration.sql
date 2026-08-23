CREATE TABLE IF NOT EXISTS "Adjustment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Percent',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "appliesTo" TEXT NOT NULL DEFAULT 'Order',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "AvailabilityRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxQuantity" INTEGER,
    "minDaysNotice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilityRuleSet_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "Adjustment" ("id","name","type","value","appliesTo","isActive","sortOrder","updatedAt")
SELECT 'adj-holiday-surcharge','Holiday Surcharge','Percent',10,'Order',true,0,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Adjustment" WHERE "id" = 'adj-holiday-surcharge');

INSERT INTO "Adjustment" ("id","name","type","value","appliesTo","isActive","sortOrder","updatedAt")
SELECT 'adj-early-bird-discount','Early Bird Discount','Percent',5,'Order',true,1,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Adjustment" WHERE "id" = 'adj-early-bird-discount');

INSERT INTO "AvailabilityRuleSet" ("id","name","minDaysNotice","isActive","notes","updatedAt")
SELECT 'avail-standard','Standard Booking Window',2,true,'Requires at least 2 days notice for all orders',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AvailabilityRuleSet" WHERE "id" = 'avail-standard');
