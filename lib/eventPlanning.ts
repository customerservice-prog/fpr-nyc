import { NYC_SERVICE_AREA_SUMMARY } from './nycServiceAreas'

export const PLANNING_PHONE = '315-884-1498'
export const PLANNING_ORIGIN = 'https://fpr-nyc-production.up.railway.app'
export const PLANNING_HELP = ['Rentals', 'Event design / layout', 'Vendor coordination', 'Day-of coordination', 'Full planning', 'Not sure yet'] as const
export const planningServices = [
  {
    slug: 'wedding-coordination', label: 'Weddings', type: 'Wedding',
    title: 'Wedding Planning & Coordination in Riverdale, NY',
    summary: 'Enjoy the day you have been planning. Bring the ceremony, reception, rentals and timeline together with one local team.',
    image: '/images/event-planning/ceremony-deck/image.png', alt: 'Outdoor ceremony seating arranged on a deck',
    intro: 'Already have a venue and vendors? Start with coordination. Still deciding how the day should look and feel? Discuss partial or full planning. We will help you choose a scope based on what is already booked and what you still need, rather than treating every wedding as the same project.',
    sections: [
      { title: 'Connect the ceremony and reception', text: 'Talk through guest arrival, ceremony seating, transitions, vendor arrival times and the reception schedule. A written timeline gives your team a shared plan and makes responsibilities clear before event day.' },
      { title: 'Plan the space, not just the table count', text: 'Consider seating, catering access, dance-floor placement and movement between areas. Our rental catalog and event-layout tool give you a starting point for discussing tents, tables, chairs, linens and lighting. Final equipment choices depend on your site and availability.' },
      { title: 'Choose the right level of support', text: 'Our published options range from day-of coordination to full-service planning. Review the included meetings and on-site hours below, then tell us about your date, venue and vendors. The written quote confirms your actual services and rental equipment.' },
    ],
    checklist: ['Your date and ceremony / reception locations', 'Approximate guest count and vendors already booked', 'What you want handled before and during the wedding'],
  },
  {
    slug: 'corporate-events', label: 'Corporate Events', type: 'Corporate event',
    title: 'Corporate Event Planning in Riverdale, NY',
    summary: 'A clear plan for employee events, company celebrations and business gatherings, from rental layout to event-day coordination.',
    image: '/images/event-planning/tent-patio-setup/image.png', alt: 'Tent and patio seating layout',
    intro: 'Company events need to work for both guests and the people running them. Begin with your event goals, schedule, location and headcount. We can scope planning and rental support around the needs of your gathering and the responsibilities your internal team will retain.',
    sections: [
      { title: 'Start with the purpose and schedule', text: 'An employee appreciation event, an outdoor gathering and a customer-facing celebration can have very different needs. Share your program, arrival windows and any presentations or activities so we can discuss a practical timeline and layout.' },
      { title: 'Coordinate the rental logistics', text: 'Discuss seating, tables, tents, lighting and other rental equipment alongside venue access, delivery and pickup. Identify who can approve the layout and receive equipment. Exact services, access requirements and fees are confirmed in the written quote.' },
      { title: 'Give your team a defined handoff', text: 'Decide which vendor contacts, setup tasks and on-site coordination responsibilities belong to our team and which stay with yours. A custom scope is useful when your event does not match the meetings or hours in a standard planning package.' },
    ],
    checklist: ['Company, event purpose and preferred date', 'Venue, guest count and event schedule', 'Rental needs, vendor contacts and approval process'],
  },
  {
    slug: 'private-parties', label: 'Private Parties & Celebrations', type: 'Private party / celebration',
    title: 'Party Planning in Riverdale, NY',
    summary: 'Bring your birthday, graduation, shower or anniversary celebration together without managing every detail yourself.',
    image: '/images/event-planning/outdoor-tent-setup/image.png', alt: 'Outdoor tent with tables and chairs',
    intro: 'Whether you are hosting at home or at a venue, start with the kind of celebration you want, the number of guests and the space you have. We will help you identify what rental equipment and planning support you need, with a scope that fits your actual event.',
    sections: [
      { title: 'Make the space work for your guests', text: 'Think about where people will sit, eat and gather, plus the flow between activities. Share photos or measurements of your space during the consultation. Tent placement and equipment choices still need a suitable site and confirmed availability.' },
      { title: 'Connect rentals and the event plan', text: 'Browse tents, tables, chairs, linens and other rentals as you plan. An event layout is a useful starting point, but it is not a reservation or a substitute for site review. Your final order should list each item and service you are booking.' },
      { title: 'Get help where you need it', text: 'You may only need rental help, or you may want layout guidance, vendor coordination or event-day support. Tell us what you already have covered. We can discuss a custom quote rather than adding services that do not fit your celebration.' },
    ],
    checklist: ['Occasion, date and approximate guest count', 'Home or venue location and available space', 'Activities, rentals and tasks you need help with'],
  },
  {
    slug: 'festivals-fundraisers', label: 'Festivals & Fundraisers', type: 'Festival / fundraiser',
    title: 'Festival & Fundraiser Planning in Riverdale, NY',
    summary: 'A custom planning conversation for community gatherings, fundraisers and events with multiple activity areas.',
    image: '/images/event-planning/tent-patio-setup/image.png', alt: 'Outdoor tent and adjacent event space',
    intro: 'Larger events rarely fit a single package without discussion. Share your event footprint, schedule, expected attendance and the people or organizations involved. We will review whether our rental and coordination services match your needs before preparing a custom scope.',
    sections: [
      { title: 'Map the event areas and responsibilities', text: 'Identify check-in, seating, food service, activities and vendor areas. Talk through delivery access and transitions between setup, the event itself and breakdown. A defined point of contact helps keep decisions and changes organized.' },
      { title: 'Scope multiple vendors and activity areas', text: 'Tell us about participating vendors, volunteer responsibilities and overlapping activities. The amount of coordination required depends on the complexity of the event, not only the number of guests. Staffing and on-site hours must be agreed in advance.' },
      { title: 'Confirm what the quote covers', text: 'Multi-day schedules and non-standard layouts need individual review. Confirm rentals, coordination, delivery, setup and pickup responsibilities in writing. Venue permissions, permits, safety requirements and specialist services must be addressed with the appropriate venue or provider; do not assume they are included.' },
    ],
    checklist: ['Organizer, date or dates, and proposed location', 'Attendance estimate and site / activity map', 'Vendors, volunteers, operating hours and help needed'],
  },
] as const
/**
 * The planning package prices and the hourly rate below were copied from the South Carolina
 * site (Sept 22, 2026) and have not been approved for NYC. While this is false the NYC
 * storefront shows the packages and what they include, but no dollar amounts: planning is
 * quoted individually and the estimator leaves it out of the known-charge subtotal.
 * Set it to true only after the owner approves NYC planning prices (update the amounts first).
 */
export const PLANNING_PRICES_APPROVED: boolean = false
/** Reference hourly rate for additional planning time (see PLANNING_PRICES_APPROVED). */
export const PLANNING_EXTRA_HOURLY_RATE = 85
const EXTRA_TIME_ITEM = /^Additional time billed at /

export const planningPackages = [
  {
    number: 1,
    name: 'Day-of Coordination',
    price: '$1,275',
    items: [
      'One 30-minute kickoff call',
      'One 60-minute planning meeting 30 days before your event',
      'Two 15-minute check-in calls',
      'Written day-of timeline',
      'Up to 1 hour of rehearsal guidance',
      'Up to 8 hours of on-site coordination on event day',
      'Email support with a 2-business-day response window',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 2,
    name: 'Signature Plus',
    price: '$1,500',
    items: [
      'Everything in Day-of Coordination',
      'Up to 3 hours of hands-on decor setup and styling the week of your event',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 3,
    name: 'Month-of Coordination',
    price: '$2,075',
    popular: true,
    items: [
      'One 30-minute kickoff call',
      'Four 45-minute planning meetings starting 8-12 weeks out',
      'Up to 4 email or text exchanges per week',
      'One 30-minute contract review call',
      'Up to 10 hours of on-site coordination on event day',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 4,
    name: 'Partial Planning',
    price: '$3,350',
    items: [
      'Everything in Month-of Coordination',
      'Weekly 30-minute check-in calls until key vendors are booked (capped at 8 calls)',
      'Biweekly 30-minute calls through your event after that',
      'Vendor outreach and negotiation capped at 5 vendor categories',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 5,
    name: 'Full-Service Planning',
    price: '$5,500',
    startingAt: true,
    items: [
      'Fully customized scope, confirmed in writing before booking',
      'Biweekly 45-minute planning meetings from booking through your event',
      'Full vendor sourcing and booking across all categories',
      'Budget tracking',
      'Up to 12 hours of on-site coordination on event day',
      'Additional time billed at $85 per hour',
    ],
  },
]
/** Package price as shown to customers: only an approved NYC price, otherwise a quote. */
export function planningPackagePriceLabel(pkg: { price: string }): string {
  return PLANNING_PRICES_APPROVED ? pkg.price : 'Quoted individually'
}
/** Package inclusions as shown to customers (the unapproved hourly rate line is left out). */
export function planningPackageItems(pkg: { items: readonly string[] }): string[] {
  return PLANNING_PRICES_APPROVED ? [...pkg.items] : pkg.items.filter(item => !EXTRA_TIME_ITEM.test(item))
}

export const planningFaqs = [
  { question: 'Can I add planning to an existing rental order?', answer: 'Yes. Include your order number in the inquiry or call 315-884-1498. We will review your existing rentals and discuss any additional planning services, subject to availability.' },
  { question: 'Do you plan more than weddings?', answer: 'Yes. We discuss corporate events, private celebrations, festivals and fundraisers as well as weddings. Events that do not fit a published package are scoped individually.' },
  { question: 'Are rentals and delivery included in the planning price?', answer: 'The package details below describe planning and coordination services. Your written quote must confirm the rental equipment, delivery, setup, pickup, travel fees and taxes that apply to your event. Do not assume that an item or service not listed is included.' },
  { question: 'What happens if my event runs longer than the package hours?', answer: PLANNING_PRICES_APPROVED ? 'The published planning packages list their included meetings and on-site hours. Additional time is billed at $' + PLANNING_EXTRA_HOURLY_RATE + ' per hour. Discuss extra time with the team when confirming your scope.' : 'The planning packages list their included meetings and on-site hours. Additional time is quoted with your planning scope. Discuss extra time with the team when confirming your scope.' },
  { question: 'Where do you provide event planning?', answer: 'We serve ' + NYC_SERVICE_AREA_SUMMARY + '. Share your location so we can confirm service availability and any delivery fees.' },
  { question: 'Does sending an inquiry reserve my event date?', answer: 'No. An inquiry starts a conversation and does not reserve equipment, staffing or a date. Your quote and booking agreement confirm availability, scope and payment requirements.' },
]
