-- NYC-only transactional email send and signed Resend delivery-event tracking.
-- Deliberately omit recipients, subjects, contents, customers, and Syracuse data.
CREATE TABLE "NycOutboundEmail" (
  "id" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'accepted',
  "lastEvent" TEXT,
  "lastEventAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NycOutboundEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NycOutboundEmail_providerMessageId_key" ON "NycOutboundEmail"("providerMessageId");
CREATE INDEX "NycOutboundEmail_status_acceptedAt_idx" ON "NycOutboundEmail"("status", "acceptedAt");

CREATE TABLE "NycEmailDeliveryEvent" (
  "id" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NycEmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NycEmailDeliveryEvent_providerMessageId_eventAt_idx" ON "NycEmailDeliveryEvent"("providerMessageId", "eventAt");
