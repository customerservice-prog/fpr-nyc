-- NYC-only 2026-11-07 contact-number migration.
-- Updates current business settings, editable content and templates.
-- Historical orders, sent messages and audit records are deliberately preserved.
CREATE FUNCTION "_fpr_nyc_swap_phone"(source_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $phone$
  SELECT replace(
    replace(
      replace(
        replace(
          replace(
            replace(source_text, '+17182834593', '+19172747857'),
          '17182834593', '19172747857'),
        '718-283-4593', '917-274-7857'),
      '7182834593', '9172747857'),
    '(718) 283-4593', '(917) 274-7857'),
  '718.283.4593', '917.274.7857');
$phone$;

-- The NYC admin Company Info page reads CompanySettings, not the source defaults.
UPDATE "CompanySettings"
SET "phone" = '917-274-7857', "updatedAt" = NOW()
WHERE "phone" IS DISTINCT FROM '917-274-7857';

DO $body$
DECLARE rec record;
DECLARE statement text;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Location', 'phone'),
      ('SystemSetting', 'value'),
      ('WebsitePage', 'title'),
      ('WebsitePage', 'content'),
      ('NavigationItem', 'label'),
      ('NavigationItem', 'url'),
      ('ThemeSettings', 'globalCustomCode'),
      ('PageCustomCode', 'code'),
      ('SourceCodeSnippet', 'code'),
      ('SetupSurvey', 'questions'),
      ('AutomaticMessage', 'subject'),
      ('AutomaticMessage', 'content'),
      ('AutomaticTextMessage', 'message'),
      ('TextMessageTemplate', 'content'),
      ('EmailTemplateOrder', 'subject'),
      ('EmailTemplateOrder', 'content'),
      ('EmailTemplateMarketing', 'subject'),
      ('EmailTemplateMarketing', 'content'),
      ('EmailTemplateMarketing', 'renderedHtml'),
      ('ContractOption', 'content'),
      ('ConversionBooster', 'content'),
      ('ResponsiveSetting', 'cssOverrides')
    ) AS columns_to_update(table_name, column_name)
  LOOP
    statement := format(
      'UPDATE %I SET %I = "_fpr_nyc_swap_phone"(%I) WHERE %I IS DISTINCT FROM "_fpr_nyc_swap_phone"(%I)',
      rec.table_name, rec.column_name, rec.column_name, rec.column_name, rec.column_name
    );
    IF rec.table_name = 'EmailTemplateMarketing' THEN
      statement := statement || ' AND "status" <> ''sent''';
    END IF;
    EXECUTE statement;
  END LOOP;
END
$body$;

-- Safely update published and draft website-builder JSON without rewriting historical revisions.
UPDATE "HomeDraft"
SET "hero" = "_fpr_nyc_swap_phone"("hero"::text)::jsonb,
    "content" = "_fpr_nyc_swap_phone"("content"::text)::jsonb
WHERE "hero"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("hero"::text)
   OR "content"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("content"::text);

UPDATE "HomeRevision"
SET "hero" = "_fpr_nyc_swap_phone"("hero"::text)::jsonb,
    "content" = "_fpr_nyc_swap_phone"("content"::text)::jsonb
WHERE "isCurrent" = TRUE
  AND ("hero"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("hero"::text)
    OR "content"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("content"::text));

UPDATE "HomeContentDraft"
SET "content" = "_fpr_nyc_swap_phone"("content"::text)::jsonb
WHERE "content"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("content"::text);
UPDATE "HomeContentRevision"
SET "content" = "_fpr_nyc_swap_phone"("content"::text)::jsonb
WHERE "isCurrent" = TRUE
  AND "content"::text IS DISTINCT FROM "_fpr_nyc_swap_phone"("content"::text);

UPDATE "HomeHeroDraft"
SET "primaryActionValue" = "_fpr_nyc_swap_phone"("primaryActionValue"),
    "secondaryActionValue" = "_fpr_nyc_swap_phone"("secondaryActionValue")
WHERE "primaryActionValue" IS DISTINCT FROM "_fpr_nyc_swap_phone"("primaryActionValue")
   OR "secondaryActionValue" IS DISTINCT FROM "_fpr_nyc_swap_phone"("secondaryActionValue");
UPDATE "HomeHeroRevision"
SET "primaryActionValue" = "_fpr_nyc_swap_phone"("primaryActionValue"),
    "secondaryActionValue" = "_fpr_nyc_swap_phone"("secondaryActionValue")
WHERE "isCurrent" = TRUE
  AND ("primaryActionValue" IS DISTINCT FROM "_fpr_nyc_swap_phone"("primaryActionValue")
    OR "secondaryActionValue" IS DISTINCT FROM "_fpr_nyc_swap_phone"("secondaryActionValue"));

DROP FUNCTION "_fpr_nyc_swap_phone"(text);
