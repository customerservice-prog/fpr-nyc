-- Secure customer order verification and staff-reviewed change requests for NYC.
CREATE TABLE IF NOT EXISTS "AssistantOrderVerification" (
  "id" TEXT NOT NULL,
  "lookupHash" TEXT NOT NULL,
  "orderId" TEXT,
  "customerId" TEXT,
  "codeHash" TEXT NOT NULL,
  "requestIpHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'created',
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantOrderVerification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssistantOrderVerification_lookupHash_createdAt_idx" ON "AssistantOrderVerification"("lookupHash","createdAt");
CREATE INDEX IF NOT EXISTS "AssistantOrderVerification_requestIpHash_createdAt_idx" ON "AssistantOrderVerification"("requestIpHash","createdAt");
CREATE INDEX IF NOT EXISTS "AssistantOrderVerification_orderId_createdAt_idx" ON "AssistantOrderVerification"("orderId","createdAt");

CREATE TABLE IF NOT EXISTS "OrderChangeRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL DEFAULT 'other',
  "itemId" TEXT,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "quotedUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "estimatedSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "customerMessage" TEXT,
  "decisionNote" TEXT,
  "reviewedByName" TEXT,
  "decidedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "finalAdditionalTotal" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderChangeRequest_orderId_status_createdAt_idx" ON "OrderChangeRequest"("orderId","status","createdAt");
CREATE INDEX IF NOT EXISTS "OrderChangeRequest_status_createdAt_idx" ON "OrderChangeRequest"("status","createdAt");
CREATE INDEX IF NOT EXISTS "OrderChangeRequest_customerId_createdAt_idx" ON "OrderChangeRequest"("customerId","createdAt");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OrderChangeRequest_orderId_fkey') THEN
    ALTER TABLE "OrderChangeRequest"
      ADD CONSTRAINT "OrderChangeRequest_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
