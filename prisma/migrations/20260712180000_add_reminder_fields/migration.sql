ALTER TABLE "Order" ADD COLUMN "balanceReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "preRentalReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "thankYouSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "oneYearReminderSentAt" TIMESTAMP(3);
