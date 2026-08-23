ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "segment" TEXT;
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "manualRecipients" TEXT;
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "recipientCount" INTEGER;
ALTER TABLE "EmailTemplateMarketing" ADD COLUMN IF NOT EXISTS "sendError" TEXT;
