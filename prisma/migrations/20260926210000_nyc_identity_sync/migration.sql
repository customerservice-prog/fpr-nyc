ALTER TABLE "ServiceArea" ALTER COLUMN "state" SET DEFAULT 'NY';
ALTER TABLE "CompanySettings" ALTER COLUMN "businessName" SET DEFAULT 'Friendly Party Rental NYC';

UPDATE "ServiceArea" SET "state" = 'NY' WHERE "state" = 'SC';
UPDATE "CompanySettings"
SET "businessName" = 'Friendly Party Rental NYC',
    "phone" = COALESCE(NULLIF("phone", ''), '315-884-1498'),
    "email" = COALESCE(NULLIF("email", ''), 'customerservice@friendlypartyrental.com'),
    "city" = CASE WHEN "city" IS NULL OR "city" = '' OR "city" = 'Greenville' THEN 'Riverdale' ELSE "city" END,
    "state" = CASE WHEN "state" IS NULL OR "state" = '' OR "state" = 'SC' THEN 'NY' ELSE "state" END,
    "address" = CASE WHEN "address" IS NULL THEN '' ELSE "address" END
WHERE "businessName" = 'Friendly Party Rental SC'
   OR "city" = 'Greenville'
   OR "state" = 'SC';
