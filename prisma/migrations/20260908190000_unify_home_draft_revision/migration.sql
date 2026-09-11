-- Unify Home Hero + Home Content editors into a single Home Draft/Revision system.
-- Non-destructive: existing HomeHeroDraft/HomeHeroRevision/HomeContentDraft/HomeContentRevision
-- tables are left untouched. This seeds the new tables from the current, already-live,
-- published state (source zero), so the new unified editor starts identical to production.

CREATE TABLE "HomeDraft" (
    "id" TEXT NOT NULL,
    "hero" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "baseRevisionNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomeDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeRevision" (
    "id" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "hero" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomeRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeRevision_revisionNumber_key" ON "HomeRevision"("revisionNumber");

INSERT INTO "HomeRevision" ("id", "revisionNumber", "isCurrent", "hero", "content", "changeSummary", "createdAt")
VALUES (
  'home_rev_1',
  1,
  true,
  '{"mobileImageUrl":"/images/mobile-hero-event-scene-v4.png","desktopImageUrl":null,"focalX":0.5,"focalY":0.5,"primaryActionType":"NAVIGATE_PAGE","primaryActionValue":"/order-by-date","primaryPosLeft":17.6,"primaryPosTop":35.8,"primaryPosWidth":35,"primaryPosHeight":6.7,"secondaryActionType":"NAVIGATE_PAGE","secondaryActionValue":"/category","secondaryPosLeft":53.1,"secondaryPosTop":35.8,"secondaryPosWidth":30.4,"secondaryPosHeight":6.4}'::jsonb,
  '{"shopCategoryHeading":"Shop by Category","viewAllRentalsButton":"VIEW ALL RENTALS","planningEventHeading":"Planning an Event?","planningEventBody":"Choose your event date to see what''s available.","planningEventButton":"SELECT EVENT DATE","bounceEyebrow":"Kid Favorite","bounceHeading":"Bounce Houses & Water Slides","bounceBody":"Make your party unforgettable, browse our most fun rentals","bounceButton":"VIEW ALL BOUNCE HOUSES & WATER SLIDES","popularHeading":"Popular Rentals","packagesHeading":"Wedding & Event Packages","packagesBody":"All-in-one packages for weddings, ceremonies, and celebrations of any size.","packagesButton":"VIEW ALL WEDDING PACKAGES","rentingEasyHeading":"Renting Is Easy","step1Label":"Pick Your Date","step2Label":"Choose Your Rentals","step3Label":"We Deliver","weddingBannerHeading":"Planning a Wedding or Large Event?","weddingBannerBody":"Explore our premium wedding rental packages.","weddingBannerButton":"VIEW WEDDING RENTALS","trust1Label":"Local & Family Owned","trust2Label":"Clean, Quality Equipment","trust3Label":"Delivery & Setup Available","eventPlanningEyebrow":"A Complete Solution","eventPlanningHeading":"Full-Service Event Planning","eventPlanningBody":"We plan it and provide it, so there is no need to hire a separate event planner.","eventPlanningButton":"Learn About Event Planning","youtubeEyebrow":"As Seen In Action","youtubeHeading":"Watch Us on YouTube"}'::jsonb,
  'Migrated from legacy Hero + Text editors into the unified Home Page editor (source zero)',
  CURRENT_TIMESTAMP
);

INSERT INTO "HomeDraft" ("id", "hero", "content", "baseRevisionNumber", "updatedAt")
VALUES (
  'home_draft_1',
  '{"mobileImageUrl":"/images/mobile-hero-event-scene-v4.png","desktopImageUrl":null,"focalX":0.5,"focalY":0.5,"primaryActionType":"NAVIGATE_PAGE","primaryActionValue":"/order-by-date","primaryPosLeft":17.6,"primaryPosTop":35.8,"primaryPosWidth":35,"primaryPosHeight":6.7,"secondaryActionType":"NAVIGATE_PAGE","secondaryActionValue":"/category","secondaryPosLeft":53.1,"secondaryPosTop":35.8,"secondaryPosWidth":30.4,"secondaryPosHeight":6.4}'::jsonb,
  '{"shopCategoryHeading":"Shop by Category","viewAllRentalsButton":"VIEW ALL RENTALS","planningEventHeading":"Planning an Event?","planningEventBody":"Choose your event date to see what''s available.","planningEventButton":"SELECT EVENT DATE","bounceEyebrow":"Kid Favorite","bounceHeading":"Bounce Houses & Water Slides","bounceBody":"Make your party unforgettable, browse our most fun rentals","bounceButton":"VIEW ALL BOUNCE HOUSES & WATER SLIDES","popularHeading":"Popular Rentals","packagesHeading":"Wedding & Event Packages","packagesBody":"All-in-one packages for weddings, ceremonies, and celebrations of any size.","packagesButton":"VIEW ALL WEDDING PACKAGES","rentingEasyHeading":"Renting Is Easy","step1Label":"Pick Your Date","step2Label":"Choose Your Rentals","step3Label":"We Deliver","weddingBannerHeading":"Planning a Wedding or Large Event?","weddingBannerBody":"Explore our premium wedding rental packages.","weddingBannerButton":"VIEW WEDDING RENTALS","trust1Label":"Local & Family Owned","trust2Label":"Clean, Quality Equipment","trust3Label":"Delivery & Setup Available","eventPlanningEyebrow":"A Complete Solution","eventPlanningHeading":"Full-Service Event Planning","eventPlanningBody":"We plan it and provide it, so there is no need to hire a separate event planner.","eventPlanningButton":"Learn About Event Planning","youtubeEyebrow":"As Seen In Action","youtubeHeading":"Watch Us on YouTube"}'::jsonb,
  1,
  CURRENT_TIMESTAMP
);
