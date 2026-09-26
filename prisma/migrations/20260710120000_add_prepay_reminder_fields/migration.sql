ALTER TABLE "Order" ADD COLUMN "prePayReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "prePayReminderDisabled" BOOLEAN NOT NULL DEFAULT false;
