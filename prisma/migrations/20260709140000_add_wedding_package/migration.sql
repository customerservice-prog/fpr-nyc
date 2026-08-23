CREATE TABLE IF NOT EXISTS "WeddingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guests" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "items" JSONB NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "signature" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeddingPackage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WeddingPackage" ("id","name","description","price","guests","image","items","popular","signature","sortOrder","updatedAt")
SELECT 'pkg-basic', 'Backyard Elopement', 'Perfect for intimate gatherings. Includes tent, tables, chairs, and basic lighting.', 345, 30, 'https://files.sysers.com/cp/upload/315/items/med/30x45_Tent.jpg', '["20x20 White Tent","3 Round Tables","30 Folding Chairs","Basic String Lighting","Setup & Breakdown"]'::jsonb, false, false, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "WeddingPackage" WHERE "id" = 'pkg-basic');

INSERT INTO "WeddingPackage" ("id","name","description","price","guests","image","items","popular","signature","sortOrder","updatedAt")
SELECT 'pkg-standard', 'Classic Ceremony', 'Great for medium-sized weddings with additional decor and seating.', 520, 50, 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_43_21-AM.png', '["20x40 White Tent","5 Round Tables","50 Folding Chairs","String Lighting","Dance Floor","Setup & Breakdown"]'::jsonb, false, false, 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "WeddingPackage" WHERE "id" = 'pkg-standard');

INSERT INTO "WeddingPackage" ("id","name","description","price","guests","image","items","popular","signature","sortOrder","updatedAt")
SELECT 'pkg-premium', 'Garden Reception', 'Ideal for larger weddings with premium furnishings and full decor.', 2380, 80, 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_51_33-AM.png', '["40x60 White Tent","10 Round Tables","100 Chiavari Chairs","Chandelier Lighting","Dance Floor","Photo Booth","Setup & Breakdown"]'::jsonb, true, false, 2, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "WeddingPackage" WHERE "id" = 'pkg-premium');

INSERT INTO "WeddingPackage" ("id","name","description","price","guests","image","items","popular","signature","sortOrder","updatedAt")
SELECT 'pkg-luxury', 'Luxury Estate', 'A full reception experience with elegant furnishings and premium decor.', 5165, 125, 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_53_36-AM.png', '["40x80 White Tent","15 Round Tables","150 Chiavari Chairs","Full Lighting Package","Dance Floor","Photo Booth","Concession Station","Dedicated Coordinator","Setup & Breakdown"]'::jsonb, false, false, 3, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "WeddingPackage" WHERE "id" = 'pkg-luxury');

INSERT INTO "WeddingPackage" ("id","name","description","price","guests","image","items","popular","signature","sortOrder","updatedAt")
SELECT 'pkg-elite', 'All-Inclusive Premium', 'The ultimate wedding experience with every amenity included.', 6925, 200, 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--06_14_30-AM.png', '["Custom Tent Configuration","25 Round Tables","250 Chiavari Chairs","Premium Lighting Package","Multiple Dance Floors","Photo Booth","Full Concession Package","Dedicated Event Team","Custom Decor","Setup & Breakdown"]'::jsonb, false, true, 4, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "WeddingPackage" WHERE "id" = 'pkg-elite');

