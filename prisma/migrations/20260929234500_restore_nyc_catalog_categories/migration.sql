-- The NYC storefront navigation exists independently of database seeding.
-- Initialize missing category definitions only. NEVER run prisma/seed.js here:
-- it resets existing passwords, item prices, quantities and company settings.
-- Keep existing slugs, hidden categories, pictures, schedules and pricing profiles.
BEGIN;

INSERT INTO "Category" (
  "id", "name", "slug", "description", "displayToCustomer", "sortOrder", "updatedAt"
)
SELECT
  'nyc-public-category-' || category.slug,
  category.name,
  category.slug,
  category.name || ' for Riverdale, selected Bronx neighborhoods and Lower Westchester. Contact the NYC team to confirm options, pricing and availability.',
  true,
  category.sort_order,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('table-chair-rentals', 'Table & Chair Rentals', 1),
  ('tent-rentals', 'Tent Rentals', 2),
  ('dance-floor-stage-rentals', 'Dance Floor & Stage Rentals', 4),
  ('party-rental-packages', 'Party Rental Packages', 5),
  ('beverage-food-service', 'Beverage & Food Service Rentals', 6),
  ('heater-fan-rentals', 'Heater & Fan Rentals', 7),
  ('linen-rentals', 'Linen & Tablecloth Rentals', 8),
  ('concession-machine-rentals', 'Concession Machine Rentals', 9),
  ('yard-game-rentals', 'Yard Game Rentals', 10),
  ('event-lighting-rentals', 'Event Lighting Rentals', 11),
  ('generator-rentals', 'Generator Rentals', 12),
  ('photobooth-rentals', 'Photobooth Rentals', 13),
  ('foam-party-machine-rentals', 'Foam Party Machine Rentals', 14),
  ('inflatable-movie-screen-rentals', 'Inflatable Movie Screen Rentals', 15),
  ('bounce-house-rentals', 'Bounce House & Waterslide Rentals', 16),
  ('weddings', 'Wedding Rentals', 17),
  ('party-rental-accessories', 'Party Rental Accessories', 18),
  ('restroom-rentals', 'Restroom Rentals', 19)
) AS category(slug, name, sort_order)
ON CONFLICT ("slug") DO NOTHING;

-- No Item, User, Customer, Order, Payment, ServiceArea or settings mutations.
-- Print only aggregate counts to deployment logs; no personal data or secrets.
DO $$
DECLARE
  category_count integer;
  visible_category_count integer;
  item_count integer;
  visible_item_count integer;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE "displayToCustomer")
    INTO category_count, visible_category_count FROM "Category";
  SELECT COUNT(*), COUNT(*) FILTER (WHERE "displayToCustomer")
    INTO item_count, visible_item_count FROM "Item";
  RAISE NOTICE 'NYC catalog initialized: categories %, published categories %, items %, published items %',
    category_count, visible_category_count, item_count, visible_item_count;
END $$;

COMMIT;
