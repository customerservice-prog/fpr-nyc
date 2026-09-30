-- NYC Stripe safeguards: server pricing provenance + idempotent webhook ledger.
-- Additive only: no existing column or row is modified.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "pricingVersion" TEXT;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "paymentIntentId" TEXT,
    "orderId" TEXT,
    "note" TEXT,
    "lastError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_status_idx" ON "StripeWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_paymentIntentId_idx" ON "StripeWebhookEvent"("paymentIntentId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_orderId_idx" ON "StripeWebhookEvent"("orderId");
