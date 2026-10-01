-- Bring NYC staff management and image library up to settings parity.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverProfileId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'User_driverProfileId_key'
  ) THEN
    CREATE UNIQUE INDEX "User_driverProfileId_key" ON "User"("driverProfileId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_driverProfileId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_driverProfileId_fkey"
      FOREIGN KEY ("driverProfileId") REFERENCES "Driver"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "GeneralImage"
  ADD COLUMN IF NOT EXISTS "altText" TEXT,
  ADD COLUMN IF NOT EXISTS "focalPoint" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT,
  ADD COLUMN IF NOT EXISTS "seasonTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "categoryTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "eventTypeTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "brandTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "width" INTEGER,
  ADD COLUMN IF NOT EXISTS "height" INTEGER,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
