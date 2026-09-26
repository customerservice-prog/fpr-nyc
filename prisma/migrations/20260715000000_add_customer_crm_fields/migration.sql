-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "company" TEXT;
ALTER TABLE "Customer" ADD COLUMN "secondaryPhone" TEXT;
ALTER TABLE "Customer" ADD COLUMN "secondaryEmail" TEXT;
ALTER TABLE "Customer" ADD COLUMN "customerType" TEXT NOT NULL DEFAULT 'Customer';
