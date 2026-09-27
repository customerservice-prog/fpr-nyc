const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const categories = [
  { name: 'Tables / Folding Chairs/ Throne Chairs', slug: 'table-chair-rentals', sortOrder: 1 },
  { name: 'Tents', slug: 'tent-rentals', sortOrder: 2 },
  { name: 'Hidden Category', slug: 'hidden-category', sortOrder: 3, displayToCustomer: false },
  { name: 'Dance-Floor/Add-ons', slug: 'dance-floor-stage-rentals', sortOrder: 4 },
  { name: 'Package Deals', slug: 'party-rental-packages', sortOrder: 5 },
  { name: 'Beverage and Food Service', slug: 'beverage-food-service', sortOrder: 6 },
  { name: 'Heating/Cooling', slug: 'heater-fan-rentals', sortOrder: 7 },
  { name: 'Linens', slug: 'linen-rentals', sortOrder: 8 },
  { name: 'CONCESSIONS', slug: 'concession-machine-rentals', sortOrder: 9 },
  { name: 'Yard Games', slug: 'yard-game-rentals', sortOrder: 10 },
  { name: 'Lighting', slug: 'event-lighting-rentals', sortOrder: 11 },
  { name: 'Generator', slug: 'generator-rentals', sortOrder: 12 },
  { name: 'Photobooth', slug: 'photobooth-rentals', sortOrder: 13 },
  { name: 'Foam Machine', slug: 'foam-party-machine-rentals', sortOrder: 14 },
  { name: 'Inflatable Movie Screen', slug: 'inflatable-movie-screen-rentals', sortOrder: 15 },
  { name: 'Bounce Houses/Waterslides', slug: 'bounce-house-rentals', sortOrder: 16 },
  { name: 'Weddings', slug: 'weddings', sortOrder: 17 },
  { name: 'Accessories', slug: 'party-rental-accessories', sortOrder: 18 },
]

// INITIAL CATALOG SCAFFOLD — quantities/prices require NYC allocation review before public launch.
// INITIAL CATALOG SCAFFOLD — quantities/prices require NYC allocation review before public launch.
const items = [
  { name: 'White Plastic Folding Chair', slug: 'white-plastic-folding-chair', cost: 2.5, quantity: 2000, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '6ft Plastic Folding Table', slug: '6ft-plastic-folding-table', cost: 13, quantity: 70, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '8ft Plastic Folding Table', slug: '8ft-plastic-folding-table', cost: 15, quantity: 50, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Resin Chair with Pad', slug: 'white-resin-chair-pad', cost: 4.5, quantity: 300, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'Gold Chiavari Chair', slug: 'gold-chiavari-chair', cost: 8, quantity: 200, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Chiavari Chair', slug: 'white-chiavari-chair', cost: 7.5, quantity: 200, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '20x20 Pole Tent', slug: '20x20-pole-tent', cost: 250, quantity: 40, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x30 Pole Tent', slug: '20x30-pole-tent', cost: 350, quantity: 25, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x40 Pole Tent', slug: '20x40-pole-tent', cost: 450, quantity: 20, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '40x60 Pole Tent', slug: '40x60-pole-tent', cost: 850, quantity: 8, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '12x12 Dance Floor Section', slug: '12x12-dance-floor', cost: 175, quantity: 15, categorySlug: 'dance-floor-stage-rentals', type: 'Regular' },
  { name: 'White Table Linen 6ft', slug: 'white-table-linen-6ft', cost: 8, quantity: 150, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'White Table Linen Round 60"', slug: 'white-table-linen-round-60', cost: 12, quantity: 100, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'Popcorn Machine', slug: 'popcorn-machine', cost: 75, quantity: 10, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Cotton Candy Machine', slug: 'cotton-candy-machine', cost: 65, quantity: 8, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Snow Cone Machine', slug: 'snow-cone-machine', cost: 55, quantity: 6, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Giant Jenga', slug: 'giant-jenga', cost: 45, quantity: 5, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'Cornhole Set', slug: 'cornhole-set', cost: 35, quantity: 8, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'String Lights 50ft', slug: 'string-lights-50ft', cost: 40, quantity: 20, categorySlug: 'event-lighting-rentals', type: 'Regular' },
  { name: 'Uplighting Package (4 lights)', slug: 'uplighting-package', cost: 85, quantity: 10, categorySlug: 'event-lighting-rentals', type: 'Regular' },
  { name: '3500W Generator', slug: '3500w-generator', cost: 125, quantity: 6, categorySlug: 'generator-rentals', type: 'Regular' },
  { name: 'Photo Booth Package', slug: 'photo-booth-package', cost: 350, quantity: 3, categorySlug: 'photobooth-rentals', type: 'Regular' },
  { name: 'Foam Party Machine', slug: 'foam-party-machine', cost: 275, quantity: 4, categorySlug: 'foam-party-machine-rentals', type: 'Regular' },
  { name: 'Inflatable Movie Screen 12ft', slug: 'inflatable-movie-screen-12ft', cost: 199, quantity: 4, categorySlug: 'inflatable-movie-screen-rentals', type: 'Regular' },
  { name: 'Bounce House - Castle', slug: 'bounce-house-castle', cost: 199, quantity: 5, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Water Slide 14ft', slug: 'water-slide-14ft', cost: 299, quantity: 3, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Combo Bounce House & Slide', slug: 'combo-bounce-house-slide', cost: 499, quantity: 3, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Portable Heater', slug: 'portable-heater', cost: 45, quantity: 12, categorySlug: 'heater-fan-rentals', type: 'Regular' },
  { name: 'Industrial Fan', slug: 'industrial-fan', cost: 35, quantity: 10, categorySlug: 'heater-fan-rentals', type: 'Regular' },
  { name: 'Stanchion with Rope', slug: 'stanchion-rope', cost: 15, quantity: 30, categorySlug: 'party-rental-accessories', type: 'Regular' },
]

const serviceAreas = [
  { city: 'Riverdale', zip: '10471', region: 'Northwest Bronx', baseFee: 0 },
  { city: 'Riverdale', zip: '10463', region: 'Northwest Bronx', baseFee: 0 },
  { city: 'Fieldston', zip: '10471', region: 'Northwest Bronx', baseFee: 0 },
  { city: 'Kingsbridge', zip: '10463', region: 'Northwest Bronx', baseFee: 0 },
  { city: 'Spuyten Duyvil', zip: '10463', region: 'Northwest Bronx', baseFee: 0 },
  { city: 'Yonkers', zip: '10701', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10703', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10704', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10705', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10710', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10550', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10552', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10553', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10801', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10804', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10805', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Bronxville', zip: '10708', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Pelham', zip: '10803', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Eastchester', zip: '10709', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Tuckahoe', zip: '10707', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Scarsdale', zip: '10583', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10601', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10603', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10605', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10606', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10607', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Larchmont', zip: '10538', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mamaroneck', zip: '10543', region: 'Lower Westchester', baseFee: 0 },
]

// INITIAL CATALOG SCAFFOLD — quantities/prices require NYC allocation review before public launch.
const items = [
  { name: 'White Plastic Folding Chair', slug: 'white-plastic-folding-chair', cost: 2.5, quantity: 2000, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '6ft Plastic Folding Table', slug: '6ft-plastic-folding-table', cost: 13, quantity: 70, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '8ft Plastic Folding Table', slug: '8ft-plastic-folding-table', cost: 15, quantity: 50, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Resin Chair with Pad', slug: 'white-resin-chair-pad', cost: 4.5, quantity: 300, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'Gold Chiavari Chair', slug: 'gold-chiavari-chair', cost: 8, quantity: 200, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Chiavari Chair', slug: 'white-chiavari-chair', cost: 7.5, quantity: 200, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '20x20 Pole Tent', slug: '20x20-pole-tent', cost: 250, quantity: 40, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x30 Pole Tent', slug: '20x30-pole-tent', cost: 350, quantity: 25, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x40 Pole Tent', slug: '20x40-pole-tent', cost: 450, quantity: 20, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '40x60 Pole Tent', slug: '40x60-pole-tent', cost: 850, quantity: 8, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '12x12 Dance Floor Section', slug: '12x12-dance-floor', cost: 175, quantity: 15, categorySlug: 'dance-floor-stage-rentals', type: 'Regular' },
  { name: 'White Table Linen 6ft', slug: 'white-table-linen-6ft', cost: 8, quantity: 150, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'White Table Linen Round 60"', slug: 'white-table-linen-round-60', cost: 12, quantity: 100, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'Popcorn Machine', slug: 'popcorn-machine', cost: 75, quantity: 10, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Cotton Candy Machine', slug: 'cotton-candy-machine', cost: 65, quantity: 8, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Snow Cone Machine', slug: 'snow-cone-machine', cost: 55, quantity: 6, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Giant Jenga', slug: 'giant-jenga', cost: 45, quantity: 5, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'Cornhole Set', slug: 'cornhole-set', cost: 35, quantity: 8, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'String Lights 50ft', slug: 'string-lights-50ft', cost: 40, quantity: 20, categorySlug: 'event-lighting-rentals', type: 'Regular' },
  { name: 'Uplighting Package (4 lights)', slug: 'uplighting-package', cost: 85, quantity: 10, categorySlug: 'event-lighting-rentals', type: 'Regular' },
  { name: '3500W Generator', slug: '3500w-generator', cost: 125, quantity: 6, categorySlug: 'generator-rentals', type: 'Regular' },
  { name: 'Photo Booth Package', slug: 'photo-booth-package', cost: 350, quantity: 3, categorySlug: 'photobooth-rentals', type: 'Regular' },
  { name: 'Foam Party Machine', slug: 'foam-party-machine', cost: 275, quantity: 4, categorySlug: 'foam-party-machine-rentals', type: 'Regular' },
  { name: 'Inflatable Movie Screen 12ft', slug: 'inflatable-movie-screen-12ft', cost: 199, quantity: 4, categorySlug: 'inflatable-movie-screen-rentals', type: 'Regular' },
  { name: 'Bounce House - Castle', slug: 'bounce-house-castle', cost: 199, quantity: 5, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Water Slide 14ft', slug: 'water-slide-14ft', cost: 299, quantity: 3, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Combo Bounce House & Slide', slug: 'combo-bounce-house-slide', cost: 499, quantity: 3, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Portable Heater', slug: 'portable-heater', cost: 45, quantity: 12, categorySlug: 'heater-fan-rentals', type: 'Regular' },
  { name: 'Industrial Fan', slug: 'industrial-fan', cost: 35, quantity: 10, categorySlug: 'heater-fan-rentals', type: 'Regular' },
  { name: 'Stanchion with Rope', slug: 'stanchion-rope', cost: 15, quantity: 30, categorySlug: 'party-rental-accessories', type: 'Regular' },
]

const serviceAreas = [
  { city: 'Riverdale', zip: '10471', region: 'Riverdale / Northwest Bronx', baseFee: 0 },
  { city: 'Riverdale', zip: '10463', region: 'Riverdale / Northwest Bronx', baseFee: 0 },
  { city: 'Fieldston', zip: '10471', region: 'Riverdale / Northwest Bronx', baseFee: 0 },
  { city: 'Kingsbridge', zip: '10463', region: 'Riverdale / Northwest Bronx', baseFee: 0 },
  { city: 'Spuyten Duyvil', zip: '10463', region: 'Riverdale / Northwest Bronx', baseFee: 0 },
  { city: 'Yonkers', zip: '10701', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10703', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10704', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10705', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Yonkers', zip: '10710', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10550', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10552', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mount Vernon', zip: '10553', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10801', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10804', region: 'Lower Westchester', baseFee: 0 },
  { city: 'New Rochelle', zip: '10805', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Bronxville', zip: '10708', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Pelham', zip: '10803', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Eastchester', zip: '10709', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Tuckahoe', zip: '10707', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Scarsdale', zip: '10583', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10601', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10603', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10605', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10606', region: 'Lower Westchester', baseFee: 0 },
  { city: 'White Plains', zip: '10607', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Larchmont', zip: '10538', region: 'Lower Westchester', baseFee: 0 },
  { city: 'Mamaroneck', zip: '10543', region: 'Lower Westchester', baseFee: 0 },
]

async function main() {
  try {
    console.log('Seeding categories...')
    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      })
    }

    console.log('Seeding items...')
    for (const item of items) {
      const category = await prisma.category.findUnique({
        where: { slug: item.categorySlug },
      })
      if (category) {
        await prisma.item.upsert({
          where: { slug: item.slug },
          update: {
            ...item,
            categoryId: category.id,
          },
          create: {
            ...item,
            categoryId: category.id,
          },
        })
      }
    }

    console.log('Seeding service areas...')
    for (const area of serviceAreas) {
      await prisma.serviceArea.upsert({
        where: { zip: area.zip },
        update: area,
        create: area,
      })
    }

    console.log('Seeding admin user...')
    const hashedPassword = await bcrypt.hash('default-password', 10)
    await prisma.admin.upsert({
      where: { username: 'bryanp315' },
      update: {},
      create: {
        username: 'bryanp315',
        password: hashedPassword,
      },
    })

    console.log('Seeding company settings...')
    await prisma.companySetting.upsert({
      where: { key: 'company_name' },
      update: { value: 'Friendly Party Rental NYC' },
      create: { key: 'company_name', value: 'Friendly Party Rental NYC' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_phone' },
      update: { value: '315-884-1498' },
      create: { key: 'company_phone', value: '315-884-1498' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_email' },
      update: { value: 'customerservice@friendlypartyrental.com' },
      create: { key: 'company_email', value: 'customerservice@friendlypartyrental.com' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_address' },
      update: { value: '' },
      create: { key: 'company_address', value: '' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_city' },
      update: { value: 'Riverdale' },
      create: { key: 'company_city', value: 'Riverdale' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_state' },
      update: { value: 'NY' },
      create: { key: 'company_state', value: 'NY' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_zip' },
      update: { value: '10471' },
      create: { key: 'company_zip', value: '10471' },
    })
    await prisma.companySetting.upsert({
      where: { key: 'company_timezone' },
      update: { value: 'America/New_York' },
      create: { key: 'company_timezone', value: 'America/New_York' },
    })

    console.log('✅ Seed complete')
  } catch (e) {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
