-- Separate private editing state from published NYC custom-page content.
-- Existing public pages and the current homepage are not modified.
CREATE TABLE "NycCustomPageDraft" (
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NycCustomPageDraft_pkey" PRIMARY KEY ("pageId")
);

ALTER TABLE "NycCustomPageDraft"
ADD CONSTRAINT "NycCustomPageDraft_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
