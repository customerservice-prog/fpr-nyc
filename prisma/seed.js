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
  { city: 'Riverdale', zip: '10463', region: 'Riverdale / Bronx', baseFee: 150 },
  { city: 'Riverdale', zip: '10471', region: 'Riverdale / Bronx', baseFee: 150 },
  { city: 'Fieldston', zip: '10471', region: 'Riverdale / Bronx', baseFee: 150 },
  { city: 'Kingsbridge', zip: '10463', region: 'Riverdale / Bronx', baseFee: 150 },
  { city: 'Yonkers', zip: '10701', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Yonkers', zip: '10703', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Yonkers', zip: '10704', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Yonkers', zip: '10705', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Yonkers', zip: '10710', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Mount Vernon', zip: '10550', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Mount Vernon', zip: '10552', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Mount Vernon', zip: '10553', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Bronxville', zip: '10708', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Tuckahoe', zip: '10707', region: 'Lower Westchester', baseFee: 175 },
  { city: 'Eastchester', zip: '10709', region: 'Lower Westchester', baseFee: 175 },
  { city: 'New Rochelle', zip: '10801', region: 'Lower Westchester', baseFee: 200 },
  { city: 'New Rochelle', zip: '10804', region: 'Lower Westchester', baseFee: 200 },
  { city: 'New Rochelle', zip: '10805', region: 'Lower Westchester', baseFee: 200 },
  { city: 'Pelham', zip: '10803', region: 'Lower Westchester', baseFee: 200 },
  { city: 'Scarsdale', zip: '10583', region: 'Lower Westchester', baseFee: 225 },
  { city: 'Larchmont', zip: '10538', region: 'Lower Westchester', baseFee: 225 },
  { city: 'Mamaroneck', zip: '10543', region: 'Lower Westchester', baseFee: 225 },
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
        description: `${cat.name} rentals for events in Riverdale, the Bronx and Lower Westchester.`,
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
        description: `Professional ${item.name} rental for events in Riverdale, the Bronx and Lower Westchester.`,
      },
    })
  }

  const closedDates = [
    new Date('2026-06-26'),
    new Date('2026-06-27'),
    new Date('2026-06-28'),
    new Date('2026-06-29'),
  ]

  for (const date of closedDates) {
    const existing = await prisma.closedDate.findFirst({
      where: {
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    })
    if (!existing) {
      await prisma.closedDate.create({
        data: { date, reason: 'Closed' },
      })
    }
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
