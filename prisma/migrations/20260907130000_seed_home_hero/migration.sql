-- Seed initial HomeHeroDraft and HomeHeroRevision rows from the
-- existing hardcoded production homepage hero ("source zero").
-- This is additive and idempotent; it does not alter any existing data.

INSERT INTO "HomeHeroDraft" (
    "id", "mobileImageUrl", "desktopImageUrl", "focalX", "focalY",
    "primaryActionType", "primaryActionValue", "primaryPosLeft", "primaryPosTop", "primaryPosWidth", "primaryPosHeight",
    "secondaryActionType", "secondaryActionValue", "secondaryPosLeft", "secondaryPosTop", "secondaryPosWidth", "secondaryPosHeight",
    "baseRevisionNumber", "updatedAt"
  ) VALUES (
    'hh_draft_1', '/images/mobile-hero-event-scene-v4.png', NULL, 0.5, 0.5,
    'NAVIGATE_PAGE', '/order-by-date', 17.6, 35.8, 35, 6.7,
    'NAVIGATE_PAGE', '/category', 53.1, 35.8, 30.4, 6.4,
    1, CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "HomeHeroRevision" (
    "id", "revisionNumber", "isCurrent", "mobileImageUrl", "desktopImageUrl", "focalX", "focalY",
    "primaryActionType", "primaryActionValue", "primaryPosLeft", "primaryPosTop", "primaryPosWidth", "primaryPosHeight",
    "secondaryActionType", "secondaryActionValue", "secondaryPosLeft", "secondaryPosTop", "secondaryPosWidth", "secondaryPosHeight",
    "changeSummary", "createdAt"
  ) VALUES (
    'hh_rev_1', 1, true, '/images/mobile-hero-event-scene-v4.png', NULL, 0.5, 0.5,
    'NAVIGATE_PAGE', '/order-by-date', 17.6, 35.8, 35, 6.7,
    'NAVIGATE_PAGE', '/category', 53.1, 35.8, 30.4, 6.4,
    'Initial revision migrated from hardcoded homepage hero (source zero)', CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;
