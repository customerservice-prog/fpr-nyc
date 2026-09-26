CREATE TABLE IF NOT EXISTS "ThemeSettings" (
  "id" TEXT NOT NULL,
  "headerStyle" INTEGER NOT NULL DEFAULT 1,
  "footerStyle" TEXT NOT NULL DEFAULT 'dark',
  "storeBackgroundImage" TEXT,
  "storeBackgroundTint" TEXT NOT NULL DEFAULT 'none',
  "categoryDisplayStyle" TEXT NOT NULL DEFAULT 'boxed',
  "colorTheme" TEXT NOT NULL DEFAULT 'theme1',
  "btnPrimaryColor" TEXT NOT NULL DEFAULT '#F5A31B',
  "btnPrimaryColorBg" TEXT NOT NULL DEFAULT '#F5A31B',
  "headerFont" TEXT NOT NULL DEFAULT 'default',
  "headerFont2" TEXT NOT NULL DEFAULT 'default',
  "categoryCarouselCount" INTEGER NOT NULL DEFAULT 12,
  "globalCustomCode" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);


CREATE TABLE IF NOT EXISTS "PageCustomCode" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageCustomCode_pkey" PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX IF NOT EXISTS "PageCustomCode_slug_key" ON "PageCustomCode"("slug");
