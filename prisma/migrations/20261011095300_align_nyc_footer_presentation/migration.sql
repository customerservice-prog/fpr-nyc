-- Match the owner's approved main-site footer presentation in this NYC database.
-- Preserve any other customized footer variant and keep the website editor editable.
ALTER TABLE "ThemeSettings" ALTER COLUMN "footerStyle" SET DEFAULT 'light-links';
UPDATE "ThemeSettings"
SET "footerStyle" = 'light-links', "updatedAt" = CURRENT_TIMESTAMP
WHERE "footerStyle" = 'dark';
