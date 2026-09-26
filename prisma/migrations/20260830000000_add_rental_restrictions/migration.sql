-- Add rental restriction override fields to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "restrictionOverrideAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "restrictionOverrideByName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "restrictionOverrideReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "restrictionMatchedIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "RentalRestriction" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "reasonCategory" TEXT NOT NULL,
  "internalNotes" TEXT,
  "sourceOrderId" TEXT,
  "sourceOrderNumber" TEXT,
  "sourceCustomerId" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "deactivatedByName" TEXT,
  "deactivationReason" TEXT,

CONSTRAINT "RentalRestriction_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE "RentalRestrictionIdentifier" (
  "id" TEXT NOT NULL,
  "restrictionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "displayValue" TEXT NOT NULL,
  "customerIdRef" TEXT,
  "addressScope" TEXT,
  "addressStreet" TEXT,
  "addressUnit" TEXT,
  "addressCity" TEXT,
  "addressState" TEXT,
  "addressZip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "RentalRestrictionIdentifier_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE "RestrictedCheckoutAttempt" (
  "id" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "eventAddress" TEXT,
  "eventCity" TEXT,
  "eventState" TEXT,
  "eventZip" TEXT,
  "eventDate" TIMESTAMP(3),
  "cartSummary" TEXT,
  "matchedRestrictionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "matchTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,

CONSTRAINT "RestrictedCheckoutAttempt_pkey" PRIMARY KEY ("id")
  );

-- CreateIndex
CREATE INDEX "RentalRestriction_status_idx" ON "RentalRestriction"("status");

-- CreateIndex
CREATE INDEX "RentalRestrictionIdentifier_type_normalizedValue_idx" ON "RentalRestrictionIdentifier"("type", "normalizedValue");

-- CreateIndex
CREATE INDEX "RentalRestrictionIdentifier_restrictionId_idx" ON "RentalRestrictionIdentifier"("restrictionId");

-- CreateIndex
CREATE INDEX "RestrictedCheckoutAttempt_status_idx" ON "RestrictedCheckoutAttempt"("status");

-- AddForeignKey
ALTER TABLE "RentalRestrictionIdentifier" ADD CONSTRAINT "RentalRestrictionIdentifier_restrictionId_fkey" FOREIGN KEY ("restrictionId") REFERENCES "RentalRestriction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
