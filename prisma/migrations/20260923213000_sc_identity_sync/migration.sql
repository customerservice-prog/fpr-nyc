-- Greenville SC identity/data cleanup.
-- This database belongs only to the South Carolina storefront.

ALTER TABLE "CompanySettings"
  ALTER COLUMN "businessName" SET DEFAULT 'Friendly Party Rental SC';

UPDATE "CompanySettings"
SET "businessName" = 'Friendly Party Rental SC'
WHERE "businessName" IS NULL
   OR btrim("businessName") = ''
   OR "businessName" = 'Friendly Party Rental';

ALTER TABLE "ServiceArea"
  ALTER COLUMN "state" SET DEFAULT 'SC';

UPDATE "ServiceArea"
SET "state" = 'SC'
WHERE "state" IS NULL
   OR btrim("state") = ''
   OR "state" = 'NY';

UPDATE "AutomaticMessage"
SET "subject" = 'Thank you for renting with Friendly Party Rental SC!'
WHERE "id" = 'automsg_thank_you'
  AND "subject" = 'Thank you for renting with Friendly Party Rental!';

UPDATE "TextMessageTemplate"
SET "content" = 'Thank you for choosing Friendly Party Rental SC! We hope your event was a success.'
WHERE "id" = 'tmpl_thankyou'
  AND "content" = 'Thank you for choosing Friendly Party Rental! We hope your event was a success.';
