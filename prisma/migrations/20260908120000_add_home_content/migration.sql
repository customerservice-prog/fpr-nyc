-- CreateTable
CREATE TABLE "HomeContentDraft" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "baseRevisionNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeContentRevision" (
    "id" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeContentRevision_revisionNumber_key" ON "HomeContentRevision"("revisionNumber");
