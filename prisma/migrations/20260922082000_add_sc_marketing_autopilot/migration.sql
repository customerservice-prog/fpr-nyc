-- Greenville marketing automation persistence. Additive and empty by default.
CREATE TABLE IF NOT EXISTS "MarketingSendLog" (
  "id" TEXT NOT NULL,
  "campaignSlug" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "customerId" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "runId" TEXT,
  "openedAt" TIMESTAMP(3),
  "lastOpenedAt" TIMESTAMP(3),
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "clickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "lastClickedUrl" TEXT,
  CONSTRAINT "MarketingSendLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingSendLog_email_sentAt_idx" ON "MarketingSendLog"("email","sentAt");
CREATE INDEX IF NOT EXISTS "MarketingSendLog_campaignSlug_idx" ON "MarketingSendLog"("campaignSlug");

CREATE TABLE IF NOT EXISTS "MarketingRun" (
  "id" TEXT NOT NULL,
  "campaignSlug" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "segment" TEXT,
  "requestedLimit" INTEGER,
  "resolvedAudienceCount" INTEGER,
  "initiatedByUserId" TEXT,
  "initiatedByName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "claimedCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "simulatedCount" INTEGER NOT NULL DEFAULT 0,
  "ownerMonitoringCopyStatus" TEXT NOT NULL DEFAULT 'not_sent',
  "errorMessage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingRun_campaignSlug_idx" ON "MarketingRun"("campaignSlug");
CREATE INDEX IF NOT EXISTS "MarketingRun_status_idx" ON "MarketingRun"("status");

CREATE TABLE IF NOT EXISTS "MarketingSendClaim" (
  "id" TEXT NOT NULL,
  "campaignSlug" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'claimed',
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingSendClaim_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='MarketingSendClaim_campaignSlug_email_key') THEN
    ALTER TABLE "MarketingSendClaim" ADD CONSTRAINT "MarketingSendClaim_campaignSlug_email_key" UNIQUE ("campaignSlug","email");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "MarketingSendClaim_email_idx" ON "MarketingSendClaim"("email");
CREATE INDEX IF NOT EXISTS "MarketingSendClaim_runId_idx" ON "MarketingSendClaim"("runId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='MarketingSendClaim_runId_fkey') THEN
    ALTER TABLE "MarketingSendClaim" ADD CONSTRAINT "MarketingSendClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketingRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MarketingLaunchLock" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "runId" TEXT,
  "lockedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingLaunchLock_pkey" PRIMARY KEY ("id")
);
INSERT INTO "MarketingLaunchLock" ("id","status","updatedAt")
VALUES ('singleton','idle',CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
