-- Orders with $0.00 recorded (amountPaid = 0) are excluded from the admin
-- schedule/calendar views by default, since an order with no payment on file
-- has not been financially confirmed and showing it alongside paid orders was
-- causing scheduling confusion. A staff member can explicitly approve a specific
-- unpaid order to appear on the schedule anyway (e.g. pay-on-delivery
-- arrangements) via a checkbox on the order detail page.
--
-- Existing orders are backfilled to true so today's schedule does not change
-- or lose any orders the moment this migration runs. Staff can un-approve any
-- specific existing order from the order detail page if desired. New orders
-- created after this migration default to false (unapproved) until either a
-- payment is recorded or a staff member explicitly approves them.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "scheduleApprovedUnpaid" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Order" ALTER COLUMN "scheduleApprovedUnpaid" SET DEFAULT false;
