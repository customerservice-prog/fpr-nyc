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
