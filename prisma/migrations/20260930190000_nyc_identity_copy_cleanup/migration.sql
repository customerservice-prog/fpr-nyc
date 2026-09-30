-- Friendly Party Rental NYC identity and customer-copy cleanup (2026-09-30).
--
-- The NYC code base was cloned from the Greenville, SC store, and two inherited
-- migrations (20260923213000_sc_identity_sync, 20260927080000_sc_runtime_isolation)
-- stamped South Carolina identity onto this NYC database. This migration restores
-- the NYC identity and removes Syracuse / Central New York / Greenville wording from
-- the NYC message templates and CMS text that can reach customers.
--
-- Only settings and template text are changed. Customer, order, payment and catalog
-- records are never touched. Every statement is idempotent (safe to re-run).
BEGIN;

-- Business identity
ALTER TABLE "CompanySettings" ALTER COLUMN "businessName" SET DEFAULT 'Friendly Party Rental NYC';
UPDATE "CompanySettings"
SET "businessName" = 'Friendly Party Rental NYC'
WHERE "businessName" IS NULL
   OR btrim("businessName") = ''
   OR "businessName" IN ('Friendly Party Rental SC', 'Friendly Party Rental', 'Friendly Party Rental Syracuse');

-- NYC service-area rows are New York rows (South Carolina ZIPs are left untouched).
ALTER TABLE "ServiceArea" ALTER COLUMN "state" SET DEFAULT 'NY';
UPDATE "ServiceArea"
SET "state" = 'NY'
WHERE upper(btrim(coalesce("state", ''))) IN ('SC', 'SOUTH CAROLINA', '')
  AND "zip" ~ '^1[0-4][0-9]{3}$';

UPDATE "RegisterSetup"
SET "location" = 'Riverdale, NY'
WHERE "location" ILIKE '%Greenville%'
   OR "location" ILIKE '%Syracuse%'
   OR upper(btrim(coalesce("location", ''))) IN ('SC', 'SOUTH CAROLINA');

-- Wrong-market wording in NYC templates and CMS text. Order matters: specific
-- phrases first, then bare place names. Word boundaries (\m, \M) keep other words intact.
CREATE OR REPLACE FUNCTION pg_temp.nyc_copy(input text) RETURNS text
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE WHEN input IS NULL THEN NULL ELSE
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      input,
      'Friendly Party Rental SC', 'Friendly Party Rental NYC', 'g'),
      'Serving Syracuse and the surrounding Central New York area', 'Serving Riverdale, the Bronx and Lower Westchester', 'gi'),
      '\mSyracuse,?\s*(NY|New York)\M', 'Riverdale, NY', 'gi'),
      '\mGreenville,?\s*(SC|South Carolina)\M', 'Riverdale, NY', 'gi'),
      '\mMinoa,?\s*(NY|New York)\M', 'Riverdale, NY', 'gi'),
      '\m(the )?(surrounding )?Central New York( area)?\M', 'Riverdale, the Bronx and Lower Westchester', 'gi'),
      '\mUpstate New York\M', 'New York', 'gi'),
      '\mSouth Carolina\M', 'New York', 'gi'),
      '\mSyracuse\M', 'Riverdale', 'gi'),
      '\mGreenville\M', 'Riverdale', 'gi'),
      '\mMinoa\M', 'Riverdale', 'gi')
  END
$fn$;

UPDATE "AutomaticMessage" SET "subject" = pg_temp.nyc_copy("subject"), "content" = pg_temp.nyc_copy("content")
WHERE "subject" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)'
   OR "content" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "AutomaticTextMessage" SET "message" = pg_temp.nyc_copy("message")
WHERE "message" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "TextMessageTemplate" SET "content" = pg_temp.nyc_copy("content")
WHERE "content" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "EmailTemplateOrder" SET "subject" = pg_temp.nyc_copy("subject"), "content" = pg_temp.nyc_copy("content")
WHERE "subject" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)'
   OR "content" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "EmailTemplateMarketing" SET "subject" = pg_temp.nyc_copy("subject"), "content" = pg_temp.nyc_copy("content"), "renderedHtml" = pg_temp.nyc_copy("renderedHtml")
WHERE "status" <> 'sent'
  AND ("subject" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)'
    OR "content" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)'
    OR coalesce("renderedHtml", '') ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)');

UPDATE "WebsitePage" SET "title" = pg_temp.nyc_copy("title"), "content" = pg_temp.nyc_copy("content")
WHERE "title" ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)'
   OR coalesce("content", '') ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "ConversionBooster" SET "content" = pg_temp.nyc_copy("content")
WHERE coalesce("content", '') ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

UPDATE "WeddingPackage" SET "description" = pg_temp.nyc_copy("description")
WHERE coalesce("description", '') ~* '(syracuse|greenville|minoa|central new york|upstate new york|south carolina|Friendly Party Rental SC)';

-- Aggregate counts only (no customer data, no secrets) in the deployment log.
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM "AutomaticMessage" WHERE "subject" || ' ' || "content" ~* '\m(syracuse|greenville|minoa|south carolina)\M|central new york|Friendly Party Rental SC') +
    (SELECT COUNT(*) FROM "AutomaticTextMessage" WHERE "message" ~* '\m(syracuse|greenville|minoa|south carolina)\M|central new york|Friendly Party Rental SC') +
    (SELECT COUNT(*) FROM "TextMessageTemplate" WHERE "content" ~* '\m(syracuse|greenville|minoa|south carolina)\M|central new york|Friendly Party Rental SC') +
    (SELECT COUNT(*) FROM "EmailTemplateOrder" WHERE "subject" || ' ' || "content" ~* '\m(syracuse|greenville|minoa|south carolina)\M|central new york|Friendly Party Rental SC') +
    (SELECT COUNT(*) FROM "WebsitePage" WHERE "title" || ' ' || coalesce("content", '') ~* '\m(syracuse|greenville|minoa|south carolina)\M|central new york|Friendly Party Rental SC') +
    (SELECT COUNT(*) FROM "CompanySettings" WHERE "businessName" <> 'Friendly Party Rental NYC')
  INTO remaining;
  RAISE NOTICE 'NYC identity cleanup: % template/settings rows still name another market', remaining;
END $$;

COMMIT;
