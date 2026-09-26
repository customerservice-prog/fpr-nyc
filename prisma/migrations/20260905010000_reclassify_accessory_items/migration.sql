-- Reclassify accessory/consumable items so they are excluded from a
-- category's advertised "starting at" price (see app/(public)/category/[slug]/page.tsx,
-- which now filters priceValues to type = 'Regular' only).
--
-- These items were previously all tagged type='Regular' -- the only value
-- ever set by data entry/seeding -- which caused a category's minPrice
-- calculation to use their low price instead of the cheapest real primary
-- rentable item in the category. This is a data-only update to an existing
-- column; no schema/structural change.

-- Tent Rentals: sidewalls, leg drape, misting, and water barrel cover are
-- accessories to a tent rental, not standalone tents.
UPDATE "Item" SET "type" = 'Addon' WHERE "slug" IN (
  '10x10-pop-up-sidewall',
  '20-side-wall-tent',
  '20-side-wall-with-windows',
  'leg-drape',
  'tent-misting-10x10-pop-up-tent',
  'water-barrel-cover'
);

-- Concession Machine Rentals: consumable supplies (kernels, floss sugar,
-- syrup) are not standalone rentable concession machines.
UPDATE "Item" SET "type" = 'Addon' WHERE "slug" IN (
  '55-oz-popcorn-kernel',
  'cotton-candy-floss-sugar-blue-raspberry',
  'cotton-candy-floss-sugar-grape',
  'cotton-candy-floss-sugar-lemon',
  'cotton-candy-floss-sugar-pink',
  'snow-cone-syrup-blue-raspberry',
  'snow-cone-syrup-cherry',
  'snow-cone-syrup-orange',
  'snow-cone-syrup-pina-colada'
);
