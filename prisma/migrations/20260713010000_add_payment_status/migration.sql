-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'succeeded';
ALTER TABLE "Payment" ADD COLUMN "pendingAmount" DOUBLE PRECISION;
