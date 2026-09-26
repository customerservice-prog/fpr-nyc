-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "scheduledAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "pending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_token_key" ON "Meeting"("token");
