CREATE TABLE IF NOT EXISTS "AutomaticMessage" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "daysToSend" INTEGER NOT NULL DEFAULT 0,
      "sendOption" TEXT NOT NULL DEFAULT 'Before Order Starts',
      "fromEmail" TEXT,
      "subject" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "filter" TEXT NOT NULL DEFAULT 'Active Only',
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AutomaticMessage_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "AutomaticMessage" ("id","name","daysToSend","sendOption","subject","content","filter","enabled") VALUES
  ('automsg_order_confirmation', 'Order Confirmation Email', 0, 'On Order Placed', 'Your order is confirmed', 'Sent automatically when a customer places an order. Content is currently managed in code; this record tracks status until wired to the live sender.', 'Active Only', true),
  ('automsg_balance_reminder', 'Balance Reminder Email', -3, 'Before Order Starts', 'Reminder: balance due for your upcoming event', 'Sent automatically before the event reminding the customer of their remaining balance. Content is currently managed in code.', 'Active Only', true),
  ('automsg_delivery_reminder', 'Delivery Reminder Email', -1, 'Before Order Starts', 'Your delivery is tomorrow', 'Sent automatically the day before a delivery order. Content is currently managed in code.', 'Active Only', true),
  ('automsg_pickup_reminder', 'Pickup Reminder Email', -1, 'Before Order Starts', 'Your pickup is tomorrow', 'Sent automatically the day before a customer-pickup order. Content is currently managed in code.', 'Active Only', true),
  ('automsg_thank_you', 'Thank You Email', 1, 'After Order Ends', 'Thank you for renting with Friendly Party Rental!', 'Sent automatically after the event ends. Content is currently managed in code.', 'Active Only', true),
  ('automsg_quote_followup', 'Quote Follow-up Email', 3, 'N/A - Incomplete Order', 'Just checking in on your quote', 'Sent automatically to follow up on an unfinished quote. Content is currently managed in code.', 'Incomplete', true),
  ('automsg_prepay_letter', 'Pre-Pay Letter', -3, 'Before Order Starts', 'Pre-Payment Option from Friendly Party Rental', 'Manual-send pre-payment reminder with pay link. Sent manually by staff, never automatically, per business rule.', 'Active Only', false)
ON CONFLICT ("id") DO NOTHING;
