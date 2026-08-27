-- Adds an OrderContact table so an order can have additional contacts
-- (Day-Of Contact, Secondary Contact, Billing Contact, etc.) beyond the
-- single primary Customer.email/Customer.phone. This is purely additive:
-- no existing Customer or Order columns are touched, so all existing
-- receipt/email/search/reporting code that reads Customer.email or
-- Customer.phone keeps working exactly as before.
--
-- Contacts created here belong to a single order ("this order only").
-- Customer-level secondary contact info continues to live on the existing
-- Customer.secondaryPhone / Customer.secondaryEmail columns, which already
-- existed in the schema but were not yet exposed in the Order Detail UI.

-- CreateTable
CREATE TABLE "OrderContact" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Other',
  "phone" TEXT,
  "email" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "OrderContact_pkey" PRIMARY KEY ("id")
  );

-- CreateIndex
CREATE INDEX "OrderContact_orderId_idx" ON "OrderContact"("orderId");

-- AddForeignKey
ALTER TABLE "OrderContact" ADD CONSTRAINT "OrderContact_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
