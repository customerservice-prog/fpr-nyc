ALTER TABLE "GoogleCalendarConnection"
  ADD COLUMN IF NOT EXISTS "searchConsoleVerificationFile" TEXT,
  ADD COLUMN IF NOT EXISTS "searchConsoleVerifiedAt" TIMESTAMP(3);
