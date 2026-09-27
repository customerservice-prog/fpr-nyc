export interface PlanningLink { label: string; href: string }
export interface PlanningSection { heading: string; body: string }
export interface CategoryPlanningContent {
  title: string
  description: string
  heading: string
  intro: string
  sections: PlanningSection[]
  links: PlanningLink[]
}

const guides: Record<string, CategoryPlanningContent> = {
  'tent-rentals': {
    title: 'Tent Rentals in Riverdale, NY | Pole & Frame Tents',
    description: 'Browse tent rentals in Riverdale, NY including pole and frame tents. Compare setup surfaces, tent sizes, prices, delivery, and date availability.',
    heading: 'Tent rentals for Riverdale weddings, parties and outdoor events',
    intro: 'Start with the setup surface, guest count and how the tent will be used. A seated meal, ceremony, buffet and dance floor all change the amount of space you need. Browse the current tents above, then check your date and delivery area before you build the rest of the order.',
    sections: [
      { heading: 'Pole tents vs. frame tents', body: 'Friendly Party Rental installs pole tents on grass where they can be staked into the ground. Frame tents are reserved for concrete or other approved hard-surface setups and use weights instead of stakes. Tell us the real setup surface before booking so the right tent is scheduled.' },
      { heading: 'Plan around people, tables and walkways', body: 'Guest count is only the starting point. Allow room for the table style you choose, chairs, aisles, food service, entrances, a dance floor and any other equipment inside the tent. The individual tent page shows the current size and price; our team confirms the final site requirements.' },
      { heading: 'Delivery and installation', body: 'Riverdale orders are delivery-only. Tent installation and removal requirements depend on the selected tent and site. Travel fees, tax and optional timing or add-on services are separate unless the item or package explicitly says otherwise.' },
    ],
    links: [
      { label: 'Check my event date', href: '/order-by-date' },
      { label: 'Tables & chairs', href: '/category/table-chair-rentals' },
      { label: 'Event lighting', href: '/category/event-lighting-rentals' },
      { label: 'Wedding rentals', href: '/weddings' },
      { label: 'Delivery areas & fee checker', href: '/service-area' },
    ],
  },
  'table-chair-rentals': {
    title: 'Table & Chair Rentals in Riverdale, NY',
    description: 'Browse table and chair rentals in Riverdale, NY. Compare banquet, round and cocktail tables plus folding, resin and Chiavari chairs with delivery.',
    heading: 'Table and chair rentals for Riverdale events',
    intro: 'Build seating around the number of guests who need a seat at the same time, then add separate tables for food, gifts, registration, cake or drinks. Browse the current inventory above and use your event date to check availability.',
    sections: [
      { heading: 'Round, banquet and cocktail tables', body: 'Round tables are useful for grouped guest seating, while banquet tables work well for rows, serving stations and head-table layouts. Cocktail tables create standing social areas. Leave enough space around every table for chairs and guest movement.' },
      { heading: 'Choose a chair style that matches the event', body: 'Folding chairs are practical for parties and ceremonies, resin chairs add a more finished look, and Chiavari chairs are commonly selected for weddings and formal events. Current styles, quantities and prices are shown in the catalog.' },
      { heading: 'Delivery is not the same as room placement', body: 'Riverdale is a delivery-only operation. If your venue needs tables or chairs placed in an exact layout, tell our team about stairs, long carries, venue deadlines and placement expectations before booking so the required service can be confirmed.' },
    ],
    links: [
      { label: 'Check my event date', href: '/order-by-date' },
      { label: 'Linen rentals', href: '/category/linen-rentals' },
      { label: 'Chiavari chair rentals', href: '/chiavari-chair-rentals' },
      { label: 'Wedding rentals', href: '/weddings' },
      { label: 'Delivery areas & fee checker', href: '/service-area' },
    ],
  },
  'bounce-house-rentals': {
    title: 'Bounce House & Water Slide Rentals in Riverdale, NY',
    description: 'Browse bounce house and water slide rentals in Riverdale, NY. Compare inflatables, setup requirements, current prices, delivery and date availability.',
    heading: 'Bounce houses and water slides delivered in Riverdale, NY',
    intro: 'Choose the type of activity first, then make sure the event site has enough clear space, access and power for the exact inflatable you want. Use the current item page for the rental price and choose your event date to check availability.',
    sections: [
      { heading: 'Match the inflatable to the setup space', body: 'Bounce houses, combo units, water slides and obstacle-style inflatables have different footprints and clearance needs. Measure the usable setup area and tell us about gates, fences, slopes, overhead branches or other access limits before the event.' },
      { heading: 'Confirm power and water before booking', body: 'Inflatables require the correct power source, and wet-use rentals also need an appropriate water connection. If power is not available at the site, ask whether a generator is required for the selected unit.' },
      { heading: 'Plan delivery around the event schedule', body: 'Enter the actual event start and end time during booking. The checkout flow shows available delivery and pickup options. If a venue requires a specific arrival or removal deadline, select or request the appropriate timing service instead of assuming a flexible window will work.' },
    ],
    links: [
      { label: 'Check my event date', href: '/order-by-date' },
      { label: 'Generator rentals', href: '/category/generator-rentals' },
      { label: 'Party rental packages', href: '/category/party-rental-packages' },
      { label: 'Concession rentals', href: '/category/concession-machine-rentals' },
      { label: 'Delivery areas & fee checker', href: '/service-area' },
    ],
  },
  'linen-rentals': {
    title: 'Linen & Tablecloth Rentals in Riverdale, NY',
    description: 'Browse linen and tablecloth rentals in Riverdale, NY for weddings, receptions and parties. Match table sizes, colors and delivery with your event order.',
    heading: 'Linen rentals for Riverdale weddings and events',
    intro: 'Choose linens after you know the table shape and size. The right cloth depends on the table dimensions and how much drop you want around the sides. Browse the available colors and styles above, then coordinate them with your tables, chairs and event design.',
    sections: [
      { heading: 'Match the cloth to the table', body: 'Round, banquet and cocktail tables use different linen dimensions. Confirm the exact table you are renting before choosing a tablecloth so the finished drop matches the look you want.' },
      { heading: 'Coordinate colors across the order', body: 'Linens, napkins, chair styles and lighting can change the overall look of the same room or tent. Build the core rental order first, then use linens to pull the event colors together.' },
      { heading: 'Bundle linens with the rest of the event', body: 'Linens can be ordered alongside tables, chairs, tents and wedding equipment so the delivery is coordinated through one Riverdale rental order. Package inclusions vary, so check the selected package before assuming linens are included.' },
    ],
    links: [
      { label: 'Tables & chairs', href: '/category/table-chair-rentals' },
      { label: 'Wedding rentals', href: '/weddings' },
      { label: 'Event lighting', href: '/category/event-lighting-rentals' },
      { label: 'Check my event date', href: '/order-by-date' },
    ],
  },
  'dance-floor-stage-rentals': {
    title: 'Dance Floor & Stage Rentals in Riverdale, NY',
    description: 'Browse dance floor and stage rentals in Riverdale, NY for weddings, parties and events. Compare current options, delivery and setup requirements.',
    heading: 'Dance floor and stage rentals for Riverdale events',
    intro: 'A dance floor or stage changes the usable space inside a venue or tent, so plan it with the tables and guest flow rather than adding it at the end. Browse the available sections and sizes above and confirm the event surface with our team.',
    sections: [
      { heading: 'Size the floor around the event', body: 'The right dance-floor size depends on guest count, room layout and how much of the event will use the floor at one time. Keep clear paths to exits, tables and service areas.' },
      { heading: 'Confirm the installation surface', body: 'Tell our team whether the setup area is indoors, outdoors, grass, concrete or another surface. Installation requirements depend on the equipment and site conditions.' },
      { heading: 'Coordinate with tents, lighting and seating', body: 'For tented receptions, reserve enough footprint for the dance floor plus table spacing and walkways. Lighting and staging should be planned at the same time so cables and equipment do not conflict with guest traffic.' },
    ],
    links: [
      { label: 'Tent rentals', href: '/category/tent-rentals' },
      { label: 'Event lighting', href: '/category/event-lighting-rentals' },
      { label: 'Wedding rentals', href: '/weddings' },
      { label: 'Check my event date', href: '/order-by-date' },
    ],
  },
  'event-lighting-rentals': {
    title: 'Event Lighting Rentals in Riverdale, NY',
    description: 'Browse event lighting rentals in Riverdale, NY including tent and decorative lighting for weddings, parties and evening events.',
    heading: 'Event lighting for tents, weddings and Riverdale celebrations',
    intro: 'Lighting is easiest to plan after you know the tent, room and event layout. Browse the current lighting options above, then match the exact add-on to the tent or event area you are using.',
    sections: [
      { heading: 'Match lighting to the tent or space', body: 'Tent lighting is size-specific. Confirm the tent dimensions before adding a lighting package so the correct quantity and configuration are reserved.' },
      { heading: 'Plan power with the rest of the equipment', body: 'Lighting, inflatables, speakers and concession equipment can all add electrical demand. Tell our team what powered rentals will be on the order so the setup can be reviewed together.' },
      { heading: 'Use lighting to shape the event after dark', body: 'String and accent lighting can make a tent or reception area feel more finished while also improving visibility after sunset. Add lighting early enough that its installation can be coordinated with the main setup.' },
    ],
    links: [
      { label: 'Tent rentals', href: '/category/tent-rentals' },
      { label: 'Generator rentals', href: '/category/generator-rentals' },
      { label: 'Wedding rentals', href: '/weddings' },
      { label: 'Check my event date', href: '/order-by-date' },
    ],
  },
  'generator-rentals': {
    title: 'Generator Rentals in Riverdale, NY',
    description: 'Browse generator rentals in Riverdale, NY for inflatables, lighting and event equipment when suitable venue power is not available.',
    heading: 'Generator rentals for Riverdale parties and event sites',
    intro: 'Use a generator when the event site does not have a suitable power source for the equipment being rented. Tell our team which powered items will be on the order so the generator requirement can be reviewed as one system.',
    sections: [
      { heading: 'Start with the equipment load', body: 'Do not choose a generator only by event size. The important question is which blowers, lights, speakers or other powered rentals must run at the same time.' },
      { heading: 'Confirm placement and access', body: 'Generators need an appropriate outdoor location and safe cable routing. Share the setup area and access details so the equipment can be placed away from guest traffic while still serving the rentals that need power.' },
      { heading: 'Reserve power with the rest of the order', body: 'Adding the generator when you reserve the inflatable, lighting or other powered equipment helps prevent a last-minute power problem at parks, open fields and other sites without convenient outlets.' },
    ],
    links: [
      { label: 'Bounce houses & water slides', href: '/category/bounce-house-rentals' },
      { label: 'Event lighting', href: '/category/event-lighting-rentals' },
      { label: 'Check my event date', href: '/order-by-date' },
      { label: 'Delivery areas & fee checker', href: '/service-area' },
    ],
  },
  'party-rental-packages': {
    title: 'Party Rental Packages in Riverdale, NY',
    description: 'Browse party rental packages in Riverdale, NY that combine tents, tables, chairs, inflatables and other event essentials into one order.',
    heading: 'Party rental packages for Riverdale celebrations',
    intro: 'Packages can simplify an event by grouping commonly rented equipment together. Read the exact included-item list before booking, because package contents and guest counts vary.',
    sections: [
      { heading: 'Compare the included equipment', body: 'Use the package list as the source of truth. A package name or photo does not add equipment that is not listed. Add extra chairs, tables, lighting or other rentals separately when your event needs more.' },
      { heading: 'Check the package against the site', body: 'A package can still require enough space, the correct setup surface, power and access for every item it contains. Review tents and inflatables against the actual event location before checkout.' },
      { heading: 'Travel fees and optional services are separate', body: 'Riverdale delivery is coordinated through the order, but travel fees, tax and optional timing or setup services remain separate unless the selected package specifically includes them.' },
    ],
    links: [
      { label: 'Tent rentals', href: '/category/tent-rentals' },
      { label: 'Tables & chairs', href: '/category/table-chair-rentals' },
      { label: 'Wedding packages', href: '/weddings' },
      { label: 'Check my event date', href: '/order-by-date' },
    ],
  },
}

export function getCategoryPlanningContent(slug: string, name: string): CategoryPlanningContent {
  if (guides[slug]) return guides[slug]
  const cleanName = name.replace(/\s*[—–-]\s*Riverdale,?\s*NY$/i, '').trim()
  return {
    title: `${cleanName} in Riverdale, NY`,
    description: `Browse ${cleanName.toLowerCase()} in Riverdale, NY from Friendly Party Rental. Check current prices, event-date availability and delivery for Downstate New York.`,
    heading: `Plan your ${cleanName.toLowerCase()} rental in Riverdale`,
    intro: 'Browse the current inventory and prices above, then choose your event date to check availability. Riverdale orders are delivery-only. Use the service-area fee checker for your location and share any venue access or setup restrictions with our team before booking.',
    sections: [
      { heading: 'Start with the event plan', body: 'Confirm the event date, guest count, usable setup space and the equipment you need before finalizing quantities. The item listing is the source for current pricing and included features.' },
      { heading: 'Check delivery and site access', body: 'Use your event address for the delivery estimate and tell our team about stairs, gates, long carries, venue deadlines or other access restrictions that could affect the rental.' },
      { heading: 'Review the complete order before checkout', body: 'Travel fees, tax and optional services are separate unless the selected item or package says they are included. Check each line item and timing selection before payment.' },
    ],
    links: [
      { label: 'Browse all rentals', href: '/category' },
      { label: 'Check my event date', href: '/order-by-date' },
      { label: 'Delivery areas & fee checker', href: '/service-area' },
      { label: 'Wedding rentals', href: '/weddings' },
    ],
  }
}
