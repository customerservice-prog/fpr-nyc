-- Add tip amount and pickup time slot to Order, plus order-number sequence counter
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupTimeSlot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "OrderCounter" (
      "id" TEXT NOT NULL,
      "value" INTEGER NOT NULL DEFAULT 9000,
      CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "OrderCounter" ("id", "value")
VALUES ('global', 9000)
ON CONFLICT ("id") DO NOTHING;
