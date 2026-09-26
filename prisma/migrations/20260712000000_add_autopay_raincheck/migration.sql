-- Add card-on-file / autopay fields to Order
ALTER TABLE "Order" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "savedPaymentMethodId" TEXT;
ALTER TABLE "Order" ADD COLUMN "autopayEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "autoChargeStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "autoChargeAttemptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Raincheck" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "redeemedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raincheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Raincheck" ADD CONSTRAINT "Raincheck_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
