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
  { city: 'Syracuse', zip: '13201', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13202', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13203', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13204', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13205', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13206', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13207', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13208', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13209', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13210', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13211', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13212', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13214', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13215', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13219', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Syracuse', zip: '13224', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'Minoa', zip: '13116', region: 'Syracuse Metro', baseFee: 0 },
  { city: 'East Syracuse', zip: '13057', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'DeWitt', zip: '13214', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Manlius', zip: '13104', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Fayetteville', zip: '13066', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Chittenango', zip: '13037', region: 'Syracuse Metro', baseFee: 35 },
  { city: 'Baldwinsville', zip: '13027', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Liverpool', zip: '13088', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Liverpool', zip: '13090', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Camillus', zip: '13031', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Salina', zip: '13088', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'North Syracuse', zip: '13212', region: 'Syracuse Metro', baseFee: 25 },
  { city: 'Cazenovia', zip: '13035', region: 'Eastern Suburbs', baseFee: 45 },
  { city: 'Canastota', zip: '13032', region: 'Eastern Suburbs', baseFee: 45 },
  { city: 'Oneida', zip: '13421', region: 'Eastern Suburbs', baseFee: 55 },
  { city: 'Bridgeport', zip: '13030', region: 'Eastern Suburbs', baseFee: 45 },
  { city: 'Kirkville', zip: '13082', region: 'Eastern Suburbs', baseFee: 45 },
  { city: 'Lyncourt', zip: '13212', region: 'Eastern Suburbs', baseFee: 25 },
  { city: 'Cicero', zip: '13039', region: 'Eastern Suburbs', baseFee: 30 },
  { city: 'Clay', zip: '13041', region: 'Eastern Suburbs', baseFee: 30 },
  { city: 'Skaneateles', zip: '13152', region: 'Southern & Western', baseFee: 45 },
  { city: 'Auburn', zip: '13021', region: 'Southern & Western', baseFee: 55 },
  { city: 'Marcellus', zip: '13108', region: 'Southern & Western', baseFee: 40 },
  { city: 'LaFayette', zip: '13084', region: 'Southern & Western', baseFee: 45 },
  { city: 'Tully', zip: '13159', region: 'Southern & Western', baseFee: 55 },
  { city: 'Jamesville', zip: '13078', region: 'Southern & Western', baseFee: 35 },
  { city: 'Nedrow', zip: '13120', region: 'Southern & Western', baseFee: 35 },
  { city: 'Onondaga Hill', zip: '13215', region: 'Southern & Western', baseFee: 30 },
  { city: 'Westvale', zip: '13219', region: 'Southern & Western', baseFee: 30 },
  { city: 'Oswego', zip: '13126', region: 'Northern', baseFee: 55 },
  { city: 'Fulton', zip: '13069', region: 'Northern', baseFee: 55 },
  { city: 'Phoenix', zip: '13135', region: 'Northern', baseFee: 50 },
  { city: 'Brewerton', zip: '13029', region: 'Northern', baseFee: 40 },
  { city: 'Central Square', zip: '13036', region: 'Northern', baseFee: 45 },
  { city: 'Lacona', zip: '13083', region: 'Northern', baseFee: 55 },
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
        description: `${cat.name} rentals in Syracuse, NY and surrounding Central New York areas.`,
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
        description: `Professional ${item.name} rental for your event in Syracuse, NY and Central New York.`,
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
        businessName: 'Friendly Party Rental',
        phone: '315-884-1498',
        email: 'customerservice@friendlypartyrental.com',
        address: '330 Costello Parkway',
        city: 'Minoa',
        state: 'NY',
        zip: '13116',
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
