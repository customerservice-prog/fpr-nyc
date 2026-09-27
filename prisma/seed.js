const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const categories = [
  { name: 'Tables / Folding Chairs/ Throne Chairs', slug: 'table-chair-rentals', sortOrder: 1 },
  { name: 'Tents', slug: 'tent-rentals', sortOrder: 2 },
  { name: 'Hidden Category', slug: 'hidden-category', sortOrder: 3, displayToCustomer: false },
  { name: 'Dance-Floor/Ad-ons', slug: 'dance-floor-stage-rentals', sortOrder: 4 },
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

const items = [
  { name: 'White Plastic Folding Chair', slug: 'white-plastic-folding-chair', cost: 2.5, quantity: 893, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Resin Chair with Pad', slug: 'white-resin-chair-pad', cost: 4.5, quantity: 200, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'Gold Chiavari Chair', slug: 'gold-chiavari-chair', cost: 8, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'White Chiavari Chair', slug: 'white-chiavari-chair', cost: 7.5, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '6ft Plastic Folding Table', slug: '6ft-plastic-folding-table', cost: 13, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '8ft Banquet Table', slug: '8ft-banquet-table', cost: 15, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: '5ft Round Table', slug: '5ft-round-table', cost: 15, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'Cocktail Table', slug: 'cocktail-table', cost: 20, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },

  { name: '20x20 Pole Tent', slug: '20x20-pole-tent', cost: 250, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x30 Pole Tent', slug: '20x30-pole-tent', cost: 325, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x40 Pole Tent', slug: '20x40-pole-tent', cost: 400, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '30x30 Pole Tent', slug: '30x30-pole-tent', cost: 575, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '30x45 Pole Tent', slug: '30x45-pole-tent', cost: 700, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '30x60 Pole Tent', slug: '30x60-pole-tent', cost: 850, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '40x40 Pole Tent', slug: '40x40-pole-tent', cost: 1500, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '40x60 Pole Tent', slug: '40x60-pole-tent', cost: 1, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '40x100 Pole Tent', slug: '40x100-pole-tent', cost: 1950, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x20 Frame Tent', slug: '20x20-frame-tent', cost: 1, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x30 Frame Tent', slug: '20x30-frame-tent', cost: 1, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '20x40 Frame Tent', slug: '20x40-frame-tent', cost: 1, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '30x40 Classic Frame Tent', slug: '30x40-classic-frame-tent', cost: 1, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '10x10 Pop-Up Canopy', slug: '10x10-pop-up-canopy', cost: 100, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },
  { name: '10x20 Pop-Up Canopy', slug: '10x20-pop-up-canopy', cost: 175, quantity: 1, categorySlug: 'tent-rentals', type: 'Regular' },

  { name: '120in Round Linen', slug: '120-round-linen', cost: 1, quantity: 1, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: '72x120 Overlay', slug: '72x120-overlay', cost: 1, quantity: 1, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'Spandex Cocktail Table Cover', slug: 'spandex-cocktail-table-cover', cost: 1, quantity: 1, categorySlug: 'linen-rentals', type: 'Regular' },
  { name: 'Napkin', slug: 'napkin', cost: 1, quantity: 1, categorySlug: 'linen-rentals', type: 'Regular' },

  { name: 'String Lights 50ft', slug: 'string-lights-50ft', cost: 40, quantity: 1, categorySlug: 'event-lighting-rentals', type: 'Regular' },
  { name: '20in Fan', slug: '20in-fan', cost: 1, quantity: 1, categorySlug: 'heater-fan-rentals', type: 'Regular' },
  { name: 'Dance Floor Section 3x3', slug: 'dance-floor-section-3x3', cost: 1, quantity: 1, categorySlug: 'dance-floor-stage-rentals', type: 'Regular' },
  { name: 'Generator', slug: 'generator', cost: 1, quantity: 1, categorySlug: 'generator-rentals', type: 'Regular' },

  { name: 'Cotton Candy Machine', slug: 'cotton-candy-machine', cost: 65, quantity: 1, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Popcorn Machine', slug: 'popcorn-machine', cost: 75, quantity: 1, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Snow Cone Machine', slug: 'snow-cone-machine', cost: 55, quantity: 1, categorySlug: 'concession-machine-rentals', type: 'Regular' },
  { name: 'Chocolate Fountain', slug: 'chocolate-fountain', cost: 1, quantity: 1, categorySlug: 'beverage-food-service', type: 'Regular' },
  { name: 'Cornhole Set', slug: 'cornhole-set', cost: 35, quantity: 1, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'Connect Four', slug: 'connect-four', cost: 1, quantity: 1, categorySlug: 'yard-game-rentals', type: 'Regular' },
  { name: 'Tumbling Timbers 5ft', slug: 'tumbling-timbers-5ft', cost: 1, quantity: 1, categorySlug: 'yard-game-rentals', type: 'Regular' },

  { name: 'Crayon Bounce Arena', slug: 'crayon-bounce-house', cost: 1, quantity: 1, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Pink Bounce House', slug: 'pink-bounce-house', cost: 1, quantity: 1, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: '18ft Purple Tropical Double Bay Water Slide', slug: '18ft-purple-tropical-double-bay', cost: 1, quantity: 1, categorySlug: 'bounce-house-rentals', type: 'Regular' },
  { name: 'Tidal Wave Water Slide', slug: 'tidal-wave-water-slide', cost: 1, quantity: 1, categorySlug: 'bounce-house-rentals', type: 'Regular' },

  { name: 'Photo Booth Package', slug: 'photo-booth-package', cost: 350, quantity: 1, categorySlug: 'photobooth-rentals', type: 'Regular' },
  { name: 'Queen Tiffany Throne Chair', slug: 'queen-tiffany-throne-chair', cost: 1, quantity: 1, categorySlug: 'table-chair-rentals', type: 'Regular' },
  { name: 'Podium & Microphone', slug: 'podium-microphone', cost: 99, quantity: 1, categorySlug: 'party-rental-accessories', type: 'Regular' },
  { name: 'Red Carpet', slug: 'red-carpet', cost: 75, quantity: 1, categorySlug: 'party-rental-accessories', type: 'Regular' },
  { name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', cost: 75, quantity: 1, categorySlug: 'party-rental-accessories', type: 'Regular' },
  { name: 'Stanchion', slug: 'stanchion', cost: 15, quantity: 1, categorySlug: 'party-rental-accessories', type: 'Regular' },
  { name: '32 Gallon Trash Can', slug: '32-gallon-trash-can', cost: 30, quantity: 1, categorySlug: 'party-rental-accessories', type: 'Regular' },
]

const serviceAreas = [
  { city: 'Riverdale', zip: '10463', region: 'Riverdale', baseFee: 79.99 },
  { city: 'Riverdale', zip: '10471', region: 'Riverdale', baseFee: 79.99 },
  { city: 'Fieldston', zip: '10471', region: 'Fieldston', baseFee: 79.99 },
  { city: 'Kingsbridge', zip: '10463', region: 'Kingsbridge', baseFee: 79.99 },
  { city: 'Northwest Bronx', zip: '10467', region: 'Northwest Bronx', baseFee: 99.99 },
  { city: 'Northwest Bronx', zip: '10468', region: 'Northwest Bronx', baseFee: 99.99 },
  { city: 'Northwest Bronx', zip: '10470', region: 'Northwest Bronx', baseFee: 99.99 },
  { city: 'Yonkers', zip: '10701', region: 'Yonkers', baseFee: 119.99 },
  { city: 'Yonkers', zip: '10703', region: 'Yonkers', baseFee: 119.99 },
  { city: 'Yonkers', zip: '10704', region: 'Yonkers', baseFee: 119.99 },
  { city: 'Yonkers', zip: '10705', region: 'Yonkers', baseFee: 119.99 },
  { city: 'Yonkers', zip: '10708', region: 'Yonkers / Bronxville', baseFee: 119.99 },
  { city: 'Yonkers', zip: '10710', region: 'Yonkers', baseFee: 119.99 },
  { city: 'Mount Vernon', zip: '10550', region: 'Mount Vernon', baseFee: 119.99 },
  { city: 'Mount Vernon', zip: '10552', region: 'Mount Vernon', baseFee: 119.99 },
  { city: 'Mount Vernon', zip: '10553', region: 'Mount Vernon', baseFee: 119.99 },
  { city: 'New Rochelle', zip: '10801', region: 'New Rochelle', baseFee: 139.99 },
  { city: 'New Rochelle', zip: '10804', region: 'New Rochelle', baseFee: 139.99 },
  { city: 'New Rochelle', zip: '10805', region: 'New Rochelle', baseFee: 139.99 },
  { city: 'Bronxville', zip: '10708', region: 'Bronxville', baseFee: 119.99 },
  { city: 'Eastchester', zip: '10709', region: 'Eastchester', baseFee: 119.99 },
  { city: 'Tuckahoe', zip: '10707', region: 'Tuckahoe', baseFee: 119.99 },
  { city: 'Pelham', zip: '10803', region: 'Pelham', baseFee: 119.99 },
]

async function main() {
  console.log('Seeding database...')

  const password = process.env.ADMIN_PASSWORD || 'Admin1234!'
  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { username: 'bryanp315' },
    update: { password: hashedPassword },
    create: {
      username: 'bryanp315',
      password: hashedPassword,
      name: 'Bryan P',
      role: 'admin',
    },
  })

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        sortOrder: cat.sortOrder,
        displayToCustomer: cat.displayToCustomer !== false,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        displayToCustomer: cat.displayToCustomer !== false,
        description: `${cat.name} rentals for Riverdale, the Northwest Bronx and Lower Westchester.`,
      },
    })
  }

  const categoryMap = {}
  const allCategories = await prisma.category.findMany()
  for (const c of allCategories) {
    categoryMap[c.slug] = c.id
  }

  for (const item of items) {
    const categoryId = categoryMap[item.categorySlug]
    if (!categoryId) continue

    await prisma.item.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        cost: item.cost,
        quantity: item.quantity,
        type: item.type,
        categoryId,
      },
      create: {
        name: item.name,
        slug: item.slug,
        cost: item.cost,
        quantity: item.quantity,
        type: item.type,
        categoryId,
        displayToCustomer: true,
        description: `Professional ${item.name} rental for your event in Riverdale, the Northwest Bronx and Lower Westchester.`,
      },
    })
  }

  for (const area of serviceAreas) {
    const existing = await prisma.serviceArea.findFirst({
      where: { city: area.city, zip: area.zip },
    })
    if (!existing) {
      await prisma.serviceArea.create({
        data: {
          city: area.city,
          state: 'NY',
          zip: area.zip,
          region: area.region,
          baseFee: area.baseFee,
        },
      })
    }
  }

  const existingRule = await prisma.depositRule.findFirst()
  if (!existingRule) {
    await prisma.depositRule.create({
      data: {
        type: 'percentage',
        amount: 25,
        isActive: true,
      },
    })
  } else {
    await prisma.depositRule.update({
      where: { id: existingRule.id },
      data: { type: 'percentage', amount: 25, isActive: true },
    })
  }

  const existingSettings = await prisma.companySettings.findFirst()
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        businessName: 'Friendly Party Rental NYC',
        phone: '315-884-1498',
        email: 'customerservice@friendlypartyrental.com',
        address: '',
        city: 'Riverdale',
        state: 'NY',
        zip: '10471',
        timeZone: 'America/New_York',
      },
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
