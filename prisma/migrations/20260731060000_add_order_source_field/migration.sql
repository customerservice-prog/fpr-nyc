-- Track whether an order/quote was created via the customer's own online checkout
-- or created by staff (admin panel / virtual assistant). Used to avoid sending
-- the "Abandoned online order" internal notification for staff-created quotes.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'online';
