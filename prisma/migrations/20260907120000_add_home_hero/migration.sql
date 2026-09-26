-- CreateTable
CREATE TABLE IF NOT EXISTS "HomeHeroDraft" (
  "id" TEXT NOT NULL,
  "mobileImageUrl" TEXT NOT NULL,
  "desktopImageUrl" TEXT,
  "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "primaryActionType" TEXT NOT NULL DEFAULT 'NAVIGATE_PAGE',
  "primaryActionValue" TEXT NOT NULL,
  "primaryPosLeft" DOUBLE PRECISION NOT NULL,
  "primaryPosTop" DOUBLE PRECISION NOT NULL,
  "primaryPosWidth" DOUBLE PRECISION NOT NULL,
  "primaryPosHeight" DOUBLE PRECISION NOT NULL,
  "secondaryActionType" TEXT NOT NULL DEFAULT 'NAVIGATE_PAGE',
  "secondaryActionValue" TEXT NOT NULL,
  "secondaryPosLeft" DOUBLE PRECISION NOT NULL,
  "secondaryPosTop" DOUBLE PRECISION NOT NULL,
  "secondaryPosWidth" DOUBLE PRECISION NOT NULL,
  "secondaryPosHeight" DOUBLE PRECISION NOT NULL,
  "baseRevisionNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeHeroDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HomeHeroRevision" (
  "id" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "mobileImageUrl" TEXT NOT NULL,
  "desktopImageUrl" TEXT,
  "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "primaryActionType" TEXT NOT NULL DEFAULT 'NAVIGATE_PAGE',
  "primaryActionValue" TEXT NOT NULL,
  "primaryPosLeft" DOUBLE PRECISION NOT NULL,
  "primaryPosTop" DOUBLE PRECISION NOT NULL,
  "primaryPosWidth" DOUBLE PRECISION NOT NULL,
  "primaryPosHeight" DOUBLE PRECISION NOT NULL,
  "secondaryActionType" TEXT NOT NULL DEFAULT 'NAVIGATE_PAGE',
  "secondaryActionValue" TEXT NOT NULL,
  "secondaryPosLeft" DOUBLE PRECISION NOT NULL,
  "secondaryPosTop" DOUBLE PRECISION NOT NULL,
  "secondaryPosWidth" DOUBLE PRECISION NOT NULL,
  "secondaryPosHeight" DOUBLE PRECISION NOT NULL,
  "changeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeHeroRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeHeroRevision_revisionNumber_key" ON "HomeHeroRevision"("revisionNumber");
