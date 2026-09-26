-- Remove duplicate Payment rows that share the same Stripe payment ID,
-- keeping only the earliest one. This can happen when a Stripe webhook
-- event and a client-side payment confirmation race each other and both
-- pass the application-level duplicate check before either has committed.
DELETE FROM "Payment" p1
USING "Payment" p2
WHERE p1."stripePaymentId" IS NOT NULL
  AND p1."stripePaymentId" = p2."stripePaymentId"
  AND (p1."createdAt", p1."id") > (p2."createdAt", p2."id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");
