// Friendly Party Rental Marketing Campaign Library.
//
// This is the curated, permanent set of campaigns that make up the annual
// marketing strategy (see MARKETING_AUDIT.md). Each entry is a distinct,
// real campaign concept with its own purpose and copy - not a generic
// template reused with a different name. "opportunity" campaigns are not
// tied to a fixed month; they exist because the Marketing Brain detects a
// real, current business condition (open capacity, slow booking pace).
//
// Each campaign also carries a layoutType - a distinct structural
// composition (not just a color theme) so campaigns with different
// purposes render with genuinely different section arrangements. See
// the LAYOUT BUILDER FUNCTIONS section below for the 8 composition
// families used across the library.
//
// This module is pure data + pure functions (no Prisma import) so it can
// be safely imported from both server and client components.

export type CampaignFamily = 'seasonal' | 'lifecycle' | 'product' | 'opportunity'
export type AudienceConfidence = 'ready' | 'broad' | 'limited'
export type CampaignTag =
  | 'wedding'
  | 'graduation'
  | 'summer-family'
  | 'fall'
  | 'holiday-corporate'
  | 'lifecycle'
  | 'product-spotlight'
  | 'availability'
  | 'upsell'
export type VisualStyle = 'elegant' | 'energetic' | 'professional' | 'personal' | 'urgency'
export type ContentStatus = 'content-ready' | 'needs-image' | 'needs-audience-review'
export type DesignStatus = 'design-ready' | 'needs-layout-review'
export type LayoutType =
  | 'editorialLuxury'
  | 'boldSeasonal'
  | 'productShowcase'
  | 'corporateEditorial'
  | 'personalLetter'
  | 'availabilityUrgency'
  | 'collectionMagazine'
  | 'announcement'

export interface CampaignDefinition {
  slug: string
  name: string
  family: CampaignFamily
  months: number[]
  goal: string
  audienceRule: string
  audienceConfidence: AudienceConfidence
  audienceNote: string
  heroCategory: string
  gridCategories: string[]
  subject: string
  altSubject: string
  preheader: string
  headline: string
  body: string
  cta: string
  ctaPath: string
  tag: CampaignTag
  visualStyle: VisualStyle
  layoutType: LayoutType
  contentStatus: ContentStatus
  designStatus: DesignStatus; bannerVariant?: 'band' | 'outline' | 'split'
}
export const CAMPAIGN_LIBRARY: CampaignDefinition[] = [
{
    slug: 'wedding-planning-season',
    name: 'Wedding Planning Season',
    family: 'seasonal',
    months: [1, 2, 3],
    goal: 'Capture early-planning wedding bookings before peak dates fill.',
    audienceRule: 'Eligible past customers (wedding-specific history not yet reliably tagged - manual refinement recommended).',
    audienceConfidence: 'limited',
    audienceNote: 'Wedding-specific history is not reliably tagged yet, so this sends to the general eligible list rather than a verified wedding-customer segment.',
    heroCategory: 'weddings',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Planning a Wedding? Reserve Your Rentals Early',
    altSubject: 'Your Wedding Setup Starts Here',
    preheader: 'Tents, seating, and lighting for Upstate South Carolina weddings.',
    headline: 'Upstate South Carolina Wedding Rentals for Your Big Day',
    body: 'Congratulations on your engagement! From tents and elegant seating to lighting and a photo booth, we help couples across Upstate South Carolina build the setup they picture for their day - delivered, set up, and picked up for you.',
    cta: 'Start Planning Your Wedding',
    ctaPath: '/rentals?category=weddings',
    tag: 'wedding',
    visualStyle: 'elegant',
    layoutType: 'editorialLuxury',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'graduation-early-booking',
    name: 'Graduation - Early Booking',
    family: 'seasonal',
    months: [3, 4],
    goal: 'Secure graduation rentals before popular June weekends fill.',
    audienceRule: 'Eligible past customers, broadened seasonally (graduation-specific tagging not yet reliable).',
    audienceConfidence: 'limited',
    audienceNote: 'Graduation-specific interest is not reliably tagged yet, so this sends to the general eligible list broadened for the season.',
    heroCategory: 'yard-game-rentals',
    gridCategories: ['tent-rentals', 'yard-game-rentals'],
    subject: 'Graduation Party Season Is Coming',
    altSubject: 'Reserve Your June Graduation Date Before It Fills',
    preheader: 'Popular June weekends fill early.',
    headline: 'Graduation Party Season Is Coming',
    body: 'Popular June weekends fill early. Reserve your tent, tables, chairs, coolers, and games now so your graduate\'s celebration is already taken care of.',
    cta: 'Reserve Graduation Rentals',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'graduation',
    visualStyle: 'energetic',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'backyard-summer-events',
    name: 'Backyard & Summer Events',
    family: 'seasonal',
    months: [5, 6],
    goal: 'Fill early-summer backyard party bookings.',
    audienceRule: 'Broad eligible audience - general summer event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - backyard events are a general-interest occasion, not a specific customer segment.',
    heroCategory: 'concession-machine-rentals',
    gridCategories: ['table-chair-rentals', 'yard-game-rentals'],
    subject: 'Your Backyard Party Starts Here',
    altSubject: 'Summer Weekends Are Booking Up',
    preheader: 'Tents, tables, games, and more for backyard celebrations.',
    headline: 'Backyard Party Season Has Arrived',
    body: 'From birthdays to graduations to just because - make your backyard the place to be with tents, tables, chairs, and yard games delivered and set up for you.',
    cta: 'See Backyard Party Rentals',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'summer-family',
    visualStyle: 'energetic',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'inflatable-waterslide-season',
    name: 'Inflatable & Waterslide Season',
    family: 'seasonal',
    months: [6, 7],
    goal: 'Promote inflatable/waterslide bookings during peak summer.',
    audienceRule: 'Broad family-event audience; inflatable-specific rental history is not reliably tagged today.',
    audienceConfidence: 'limited',
    audienceNote: 'We cannot yet verify who has rented inflatables before, so this reaches the general eligible list rather than a proven inflatable-renter segment.',
    heroCategory: 'bounce-house-rentals',
    gridCategories: ['bounce-house-rentals', 'foam-party-machine-rentals'],
    subject: 'Summer Fun Starts With a Waterslide',
    altSubject: 'Reserve Your Summer Inflatable Date',
    preheader: 'Bounce houses and waterslides for unforgettable summer parties.',
    headline: 'Make This Summer Unforgettable',
    body: 'Bounce houses, waterslides, and inflatables bring the fun - perfect for birthdays, family reunions, and backyard get-togethers. Popular summer weekends go fast.',
    cta: 'See Inflatables & Waterslides',
    ctaPath: '/rentals?category=bounce-house-rentals',
    tag: 'summer-family',
    visualStyle: 'energetic',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'corporate-picnic-season',
    name: 'Corporate Picnic Season',
    family: 'seasonal',
    months: [6, 7],
    goal: 'Book company picnics and team events during peak summer.',
    audienceRule: 'Customers with a company on file, plus broad summer audience.',
    audienceConfidence: 'limited',
    audienceNote: 'Company-on-file data is incomplete, so this reaches the general eligible list broadened for the season rather than a verified corporate segment.',
    heroCategory: 'beverage-food-service',
    gridCategories: ['tent-rentals', 'beverage-food-service'],
    subject: 'Planning Your Company Picnic?',
    altSubject: 'Corporate Summer Events, Handled',
    preheader: 'Tents, tables, games, and setup for company picnics.',
    headline: 'Company Picnic Season Is Here',
    body: 'Make your company picnic easy to plan - tents, tables, chairs, games, and food service equipment, delivered and set up so your team can just show up and enjoy it.',
    cta: 'Plan Your Company Picnic',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'holiday-corporate',
    visualStyle: 'professional',
    layoutType: 'corporateEditorial',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'fall-events',
    name: 'Fall Events',
    family: 'seasonal',
    months: [9],
    goal: 'Capture additional fall event demand during a historically lower-volume month.',
    audienceRule: 'Broad eligible audience - fall/general event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Fall event interest is not segment-specific, so this reaches the general eligible list.',
    heroCategory: 'heater-fan-rentals',
    gridCategories: ['heater-fan-rentals', 'table-chair-rentals'],
    subject: 'Keep the Party Going Into Fall',
    altSubject: 'Fall Event Dates Are Open',
    preheader: 'Tents, heaters, and seating for fall celebrations.',
    headline: 'Fall Event Dates Are Open',
    body: 'Cooler weather doesn\'t mean the party has to stop. Heated tents, tables, and lighting keep your fall event comfortable and festive.',
    cta: 'See Fall Event Rentals',
    ctaPath: '/rentals?category=heater-fan-rentals',
    tag: 'fall',
    visualStyle: 'professional',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'holiday-corporate-events',
    name: 'Holiday Corporate Events',
    family: 'seasonal',
    months: [10, 11],
    goal: 'Book corporate holiday parties before December calendars fill.',
    audienceRule: 'Customers with a company on file, plus broad audience.',
    audienceConfidence: 'limited',
    audienceNote: 'Company-on-file data is incomplete, so this reaches the general eligible list rather than a verified corporate segment.',
    heroCategory: 'linen-rentals',
    gridCategories: ['linen-rentals', 'photobooth-rentals'],
    subject: 'Planning Your Company Holiday Party?',
    altSubject: 'Reserve Your Holiday Event Setup',
    preheader: 'Professional setup for company holiday parties.',
    headline: 'Planning Your Company Holiday Party?',
    body: 'Tables, chairs, linens, a photo booth, and full event setup - we help make your company\'s holiday party feel effortless, from planning to pickup.',
    cta: 'Plan Your Holiday Event',
    ctaPath: '/rentals?category=linen-rentals',
    tag: 'holiday-corporate',
    visualStyle: 'professional',
    layoutType: 'corporateEditorial',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'photo-booth-spotlight',
    name: 'Photo Booth Spotlight',
    family: 'product',
    months: [],
    goal: 'Grow awareness and bookings of the expanded photo booth offering.',
    audienceRule: 'Broad eligible audience - new/expanded product, historical data limited by design.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a newer/expanded offering, so we do not yet have a proven customer segment to target.',
    heroCategory: 'photobooth-rentals',
    gridCategories: ['photobooth-rentals'],
    subject: 'Make Your Event More Memorable',
    altSubject: 'Have You Seen Our Photo Booth?',
    preheader: 'A guest favorite for weddings, birthdays, and corporate events.',
    headline: 'Make Your Event More Memorable',
    body: 'Our photo booth is one of the most requested additions to weddings, birthdays, graduations, and corporate events. Guests love it - and it\'s easier to add than you think.',
    cta: 'Explore Photo Booth Packages',
    ctaPath: '/rentals?category=photobooth-rentals',
    tag: 'product-spotlight',
    visualStyle: 'energetic',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'annual-rebooking',
    name: 'Annual Rebooking',
    family: 'lifecycle',
    months: [],
    goal: 'Re-engage past customers roughly a year after their last event, before they consider a competitor.',
    audienceRule: 'Past customers whose most recent event was approximately 9-15 months ago.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order event dates - this is a verified, specific audience, not a broad guess.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Planning Another Event This Year?',
    altSubject: 'We\'d Love to Help With Your Next Celebration',
    preheader: 'A quick note from Friendly Party Rental.',
    headline: 'Planning Another Event This Year?',
    body: 'Thanks for choosing Friendly Party Rental for a past event. If you have another celebration coming up, we\'re here to help again - no need to start from scratch.',
    cta: 'Plan Your Next Event',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'dormant-winback',
    name: 'Dormant Customer Winback',
    family: 'lifecycle',
    months: [],
    goal: 'Re-engage customers who have not booked in 12+ months, without sounding desperate.',
    audienceRule: 'Past customers whose most recent event was 12+ months ago.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order event dates - this is a verified, specific audience, not a broad guess.',
    heroCategory: 'tent-rentals',
    gridCategories: ['bounce-house-rentals', 'photobooth-rentals'],
    subject: 'It\'s Been a While - Planning Something New?',
    altSubject: 'We\'d Love to Help With Your Next Event',
    preheader: 'A note from Friendly Party Rental.',
    headline: 'It\'s Been a While',
    body: 'It\'s been a little while since your last event with us. If something\'s coming up - big or small - we\'d love the chance to help again.',
    cta: 'See What\'s New',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'open-availability-opportunity',
    name: 'Open Availability Opportunity', bannerVariant: 'band',
    family: 'opportunity',
    months: [],
    goal: 'Fill specific upcoming weekends when booking pace is running behind capacity (generated by the Marketing Brain, not a fixed calendar date).',
    audienceRule: 'Broad eligible audience; date range set at campaign creation time based on real availability.',
    audienceConfidence: 'broad',
    audienceNote: 'Audience is broad by design; the real signal here is the specific open date range set at creation, not the audience itself.',
    heroCategory: 'party-rental-packages',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Open Dates This Month',
    altSubject: 'Late Availability - Limited Dates',
    preheader: 'Current availability for upcoming weekends.',
    headline: 'Open Dates This Month',
    body: 'We have availability opening up soon. If you\'re planning an event, now\'s a great time to check dates before they fill.',
    cta: 'Check Availability',
    ctaPath: '/rentals',
    tag: 'availability',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'wedding-tent-seating',
    name: 'Wedding Rentals - Tent & Seating Focus',
    family: 'seasonal',
    months: [2, 3, 4],
    goal: 'Move engaged couples from browsing to booking with a focused look at tent and seating options.',
    audienceRule: 'Eligible past customers; wedding-specific history is not reliably tagged yet.',
    audienceConfidence: 'limited',
    audienceNote: 'Wedding-specific history is not reliably tagged yet, so this reaches the general eligible list rather than a verified engaged-couple segment.',
    heroCategory: 'table-chair-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals', 'linen-rentals'],
    subject: 'The Two Rentals Every Wedding Needs First',
    altSubject: 'Tent and Seating, Chosen the Easy Way',
    preheader: 'A clear starting point for your wedding rental checklist.',
    headline: 'Start With the Tent, Then the Seating',
    body: 'Most couples start their rental checklist in the same place: a tent and enough comfortable seating for every guest. We walk you through size and layout options for your guest count, then handle delivery and setup so this part of the planning is settled early.',
    cta: 'Compare Tent & Seating Options',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'wedding',
    visualStyle: 'elegant',
    layoutType: 'editorialLuxury',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
{
    slug: 'wedding-reception-essentials',
    name: 'Wedding Reception Essentials',
    family: 'seasonal',
    months: [3, 4],
    goal: 'Introduce reception-focused rentals (linens, dance floor, staging) once the tent/seating decision is likely made.',
    audienceRule: 'Eligible past customers; wedding-specific history is not reliably tagged yet.',
    audienceConfidence: 'limited',
    audienceNote: 'Wedding-specific history is not reliably tagged yet, so this reaches the general eligible list rather than a verified engaged-couple segment.',
    heroCategory: 'dance-floor-stage-rentals',
    gridCategories: ['linen-rentals', 'dance-floor-stage-rentals', 'table-chair-rentals'],
    subject: 'The Details That Make a Reception Feel Finished',
    altSubject: 'Linens, a Dance Floor, and the Little Things',
    preheader: 'Reception rentals that pull the whole room together.',
    headline: 'The Details That Pull a Reception Together',
    body: 'Once the tent and seating are settled, the reception details are next: table linens that match your colors, a dance floor sized for your guest list, and staging for toasts or a band. We help you choose pieces that fit the room, not just the checklist.',
    cta: 'Browse Reception Rentals',
    ctaPath: '/rentals?category=linen-rentals',
    tag: 'wedding',
    visualStyle: 'elegant',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'wedding-photobooth-spotlight',
    name: 'Wedding Photo Booth',
    family: 'product',
    months: [],
    goal: 'Add a photo booth to weddings already planning other rentals with us.',
    audienceRule: 'Broad eligible audience; wedding-specific history is not reliably tagged.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is an add-on offer, not a verified wedding-customer segment.',
    heroCategory: 'photobooth-rentals',
    gridCategories: ['photobooth-rentals'],
    subject: 'A Photo Booth Guests Actually Use',
    altSubject: 'Add This to Your Wedding Reception',
    preheader: 'One of the most requested wedding add-ons we offer.',
    headline: 'Give Guests a Reason to Get Off Their Phones',
    body: 'A photo booth turns waiting-around time into some of the best candid photos of the night. It sets up quietly in a corner of the reception, runs itself, and sends guests home with something to remember. Easy to add to an existing order.',
    cta: 'See Photo Booth Packages',
    ctaPath: '/rentals?category=photobooth-rentals',
    tag: 'wedding',
    visualStyle: 'elegant',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'wedding-lighting-ambiance',
    name: 'Wedding Lighting & Ambiance',
    family: 'product',
    months: [],
    goal: 'Promote event lighting as a low-cost, high-impact upgrade for wedding receptions.',
    audienceRule: 'Broad eligible audience; wedding-specific history is not reliably tagged.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is an add-on offer, not a verified wedding-customer segment.',
    heroCategory: 'event-lighting-rentals',
    gridCategories: ['event-lighting-rentals', 'dance-floor-stage-rentals'],
    subject: 'The Upgrade That Changes How Photos Look',
    altSubject: 'One Small Change, a Completely Different Room',
    preheader: 'Event lighting that changes how a tent or hall feels after dark.',
    headline: 'The Same Tent Looks Different After Dark',
    body: 'Lighting is the fastest way to change how a reception feels once the sun goes down. A warm wash over the dance floor or string lighting through the tent costs less than most couples expect, and it shows up in almost every photo from the night.',
    cta: 'Explore Lighting Options',
    ctaPath: '/rentals?category=event-lighting-rentals',
    tag: 'wedding',
    visualStyle: 'elegant',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'wedding-last-availability',
    name: 'Wedding Last-Availability Reminder', bannerVariant: 'outline',
    family: 'seasonal',
    months: [4, 5],
    goal: 'Prompt engaged couples who have not yet booked to reserve before peak wedding weekends fill.',
    audienceRule: 'Eligible past customers; wedding-specific history is not reliably tagged yet.',
    audienceConfidence: 'limited',
    audienceNote: 'Wedding-specific history is not reliably tagged yet, so this reaches the general eligible list rather than a verified engaged-couple segment.',
    heroCategory: 'weddings',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Popular Wedding Weekends Book Months Out',
    altSubject: 'Still Deciding on Your Wedding Rentals?',
    preheader: 'A quick nudge if your date is not locked in yet.',
    headline: 'If Your Date Isn\'t Locked In Yet, Now Is the Time',
    body: 'Tents and seating for peak wedding weekends tend to be reserved well ahead of the date. If you have been meaning to get a quote but haven\'t yet, this is a good week to do it - there is no cost to check availability and pricing for your date.',
    cta: 'Check Your Wedding Date',
    ctaPath: '/rentals?category=weddings',
    tag: 'wedding',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'graduation-tent-availability',
    name: 'Graduation Tent Availability', bannerVariant: 'band',
    family: 'seasonal',
    months: [3, 4],
    goal: 'Highlight tent availability specifically for graduation weekends before June fills up.',
    audienceRule: 'Eligible past customers, broadened seasonally (graduation-specific tagging not yet reliable).',
    audienceConfidence: 'limited',
    audienceNote: 'Graduation-specific interest is not reliably tagged yet, so this reaches the general eligible list broadened for the season.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'heater-fan-rentals'],
    subject: 'Tents for Graduation Weekend - Check Your Date',
    altSubject: 'Rain or Shine, the Party Goes On',
    preheader: 'A tent keeps a graduation party going no matter the forecast.',
    headline: 'One Rental That Solves the Weather Question',
    body: 'June weather in Upstate South Carolina is never a sure thing. A tent means your graduation party happens rain or shine, with room for food, gifts, and everyone who wants to stop by. Sizes range from a small canopy to a full backyard cover.',
    cta: 'Check Tent Availability',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'graduation',
    visualStyle: 'energetic',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'graduation-tables-chairs',
    name: 'Graduation Tables & Chairs',
    family: 'seasonal',
    months: [3, 4],
    goal: 'Promote table and chair packages sized for typical graduation open houses.',
    audienceRule: 'Eligible past customers, broadened seasonally (graduation-specific tagging not yet reliable).',
    audienceConfidence: 'limited',
    audienceNote: 'Graduation-specific interest is not reliably tagged yet, so this reaches the general eligible list broadened for the season.',
    heroCategory: 'table-chair-rentals',
    gridCategories: ['table-chair-rentals', 'yard-game-rentals'],
    subject: 'How Many Tables Does a Graduation Party Need?',
    altSubject: 'Seating for Every Guest, Sized to Your Yard',
    preheader: 'A quick way to plan seating for an open house.',
    headline: 'Seating for Every Guest Who Stops By',
    body: 'Graduation open houses tend to have guests coming and going all afternoon, which makes seating harder to plan than a seated dinner. We help you figure out a table and chair count that works for a rotating crowd, then deliver and set it up before your first guest arrives.',
    cta: 'Plan Your Table Count',
    ctaPath: '/rentals?category=table-chair-rentals',
    tag: 'graduation',
    visualStyle: 'energetic',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'graduation-party-package',
    name: 'Graduation Party Package',
    family: 'seasonal',
    months: [4, 5],
    goal: 'Simplify graduation planning with a bundled package instead of individual items.',
    audienceRule: 'Eligible past customers, broadened seasonally (graduation-specific tagging not yet reliable).',
    audienceConfidence: 'limited',
    audienceNote: 'Graduation-specific interest is not reliably tagged yet, so this reaches the general eligible list broadened for the season.',
    heroCategory: 'party-rental-packages',
    gridCategories: ['party-rental-packages', 'tent-rentals'],
    subject: 'One Package Instead of a Dozen Decisions',
    altSubject: 'Graduation Planning, Simplified',
    preheader: 'A bundled tent, table, and chair package for graduation season.',
    headline: 'Skip the Spreadsheet - Start With a Package',
    body: 'Planning a graduation party usually means juggling a tent, tables, chairs, and a few extras separately. Our package pricing bundles the essentials together at a better combined price, so you can make one decision instead of five and still adjust the details later.',
    cta: 'See Graduation Packages',
    ctaPath: '/rentals?category=party-rental-packages',
    tag: 'graduation',
    visualStyle: 'energetic',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'graduation-last-availability',
    name: 'Graduation Last-Availability Reminder', bannerVariant: 'split',
    family: 'seasonal',
    months: [5],
    goal: 'Prompt procrastinating customers to book before June graduation weekends sell out.',
    audienceRule: 'Eligible past customers, broadened seasonally (graduation-specific tagging not yet reliable).',
    audienceConfidence: 'limited',
    audienceNote: 'Graduation-specific interest is not reliably tagged yet, so this reaches the general eligible list broadened for the season.',
    heroCategory: 'table-chair-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'June Weekends Are Going Fast',
    altSubject: 'Graduation Party Coming Up? Check Now',
    preheader: 'A reminder before the busiest graduation weekends fill.',
    headline: 'A Quick Reminder Before June Fills Up',
    body: 'If graduation season has been on your to-do list without a checkmark next to it yet, popular June weekends are the first to fill. It only takes a minute to see what is still available for your date and get a price before you decide.',
    cta: 'See What Is Still Open',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'graduation',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'spring-event-planning',
    name: 'Spring Event Planning',
    family: 'seasonal',
    months: [2, 3],
    goal: 'Get ahead of the season by prompting early planning before the spring/summer rush.',
    audienceRule: 'Broad eligible audience - general spring event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - early-season planning interest is not segment-specific.',
    heroCategory: 'dance-floor-stage-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Get Ahead of the Spring Rush',
    altSubject: 'Planning Season Starts Now',
    preheader: 'The earlier you plan, the more dates are available.',
    headline: 'The Best Time to Plan Is Before It Gets Busy',
    body: 'Once the weather turns, our calendar fills up quickly. Planning even a few weeks early gives you first pick of dates and equipment instead of whatever is left. If you have an event on the calendar for this spring or summer, now is a good time to start.',
    cta: 'Start Planning Early',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'summer-family',
    visualStyle: 'professional',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
{
    slug: 'summer-weekend-availability',
    name: 'Summer Weekend Availability', bannerVariant: 'outline',
    family: 'seasonal',
    months: [6, 7, 8],
    goal: 'Encourage last-minute summer bookings by highlighting that weekend availability is genuinely limited during peak season.',
    audienceRule: 'Broad eligible audience - general summer event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - summer weekend demand is general, not tied to a specific verified segment.',
    heroCategory: 'photobooth-rentals',
    gridCategories: ['tent-rentals', 'bounce-house-rentals'],
    subject: 'Summer Weekends Fill Faster Than You Think',
    altSubject: 'Still Need a Date This Summer?',
    preheader: 'Peak summer weekends go first - check what is open.',
    headline: 'Summer Saturdays Go First',
    body: 'Between weddings, graduations, and backyard parties, summer Saturdays are our busiest days of the year. If you still need equipment for an event this summer, it is worth checking sooner rather than later, especially for a specific weekend.',
    cta: 'Check This Weekend',
    ctaPath: '/rentals',
    tag: 'summer-family',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'family-event-package',
    name: 'Family Event Package',
    family: 'seasonal',
    months: [5, 6],
    goal: 'Promote a bundled package aimed at family gatherings, reunions, and birthday parties.',
    audienceRule: 'Broad eligible audience - general family-event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - family gatherings are a general-interest occasion, not a specific customer segment.',
    heroCategory: 'party-rental-packages',
    gridCategories: ['party-rental-packages', 'bounce-house-rentals'],
    subject: 'Everything for a Family Get-Together, Bundled',
    altSubject: 'One Package for the Whole Family Party',
    preheader: 'Tents, tables, and a bounce house, bundled together.',
    headline: 'Built for Birthdays, Reunions, and Everything Between',
    body: 'A family gathering usually needs a mix of the same things: shade or shelter, seating, and something to keep the kids entertained. Our family package bundles a tent, tables, chairs, and a bounce house at a better combined price than booking each separately.',
    cta: 'See the Family Package',
    ctaPath: '/rentals?category=party-rental-packages',
    tag: 'summer-family',
    visualStyle: 'energetic',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'fall-tent-rentals',
    name: 'Fall Tent Rentals',
    family: 'seasonal',
    months: [9, 10],
    goal: 'Promote heated tent setups specifically for fall outdoor events.',
    audienceRule: 'Broad eligible audience - fall/general event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Fall event interest is not segment-specific, so this reaches the general eligible list.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'heater-fan-rentals'],
    subject: 'A Tent and a Heater Solve the Fall Weather Problem',
    altSubject: 'Keep Your Fall Event Outside, Comfortably',
    preheader: 'Heated tents make fall outdoor events comfortable.',
    headline: 'You Don\'t Have to Move the Party Indoors',
    body: 'Cooler nights don\'t have to mean giving up an outdoor event. A tent paired with a heater keeps guests comfortable well into fall, and it usually costs less than renting an indoor venue. We help size both to your space and guest count.',
    cta: 'See Fall Tent Options',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'fall',
    visualStyle: 'professional',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'halloween-fall-party',
    name: 'Halloween & Fall Party Events',
    family: 'seasonal',
    months: [9, 10],
    goal: 'Promote rentals for Halloween and fall-themed parties, including bounce houses and seating.',
    audienceRule: 'Broad eligible audience - fall/general event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Fall event interest is not segment-specific, so this reaches the general eligible list.',
    heroCategory: 'bounce-house-rentals',
    gridCategories: ['bounce-house-rentals', 'table-chair-rentals'],
    subject: 'Planning a Halloween or Fall Party?',
    altSubject: 'Bounce Houses Aren\'t Just a Summer Thing',
    preheader: 'Bounce houses, seating, and setup for fall parties.',
    headline: 'Fall Parties Deserve the Same Fun as Summer Ones',
    body: 'A bounce house, some extra seating, and a bit of planning go a long way for a Halloween bash or a fall festival. We deliver, set up, and pick up so you can focus on the decorations and the candy.',
    cta: 'See Fall Party Rentals',
    ctaPath: '/rentals?category=bounce-house-rentals',
    tag: 'fall',
    visualStyle: 'energetic',
    layoutType: 'boldSeasonal',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'corporate-holiday-early-planning',
    name: 'Corporate Holiday Planning - Early',
    family: 'seasonal',
    months: [9, 10],
    goal: 'Prompt companies to start holiday party planning early, before December calendars fill.',
    audienceRule: 'Customers with a company on file, plus broad audience.',
    audienceConfidence: 'limited',
    audienceNote: 'Company-on-file data is incomplete, so this reaches the general eligible list rather than a verified corporate segment.',
    heroCategory: 'linen-rentals',
    gridCategories: ['linen-rentals', 'table-chair-rentals'],
    subject: 'Start Your Company Holiday Party Now, Thank Yourself in December',
    altSubject: 'December Books Up Faster Than You Would Think',
    preheader: 'Early planning means better dates and better pricing.',
    headline: 'The Companies With the Best Dates Plan in the Fall',
    body: 'December is our busiest month for corporate events, and the best venues, tents, and dates go to whoever plans first. Getting a quote in September or October does not commit you to anything, but it does mean your preferred date is still available.',
    cta: 'Get an Early Quote',
    ctaPath: '/rentals?category=linen-rentals',
    tag: 'holiday-corporate',
    visualStyle: 'professional',
    layoutType: 'corporateEditorial',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'holiday-photo-booth',
    name: 'Holiday Photo Booth',
    family: 'product',
    months: [10, 11],
    goal: 'Add a photo booth to corporate and family holiday parties already booking with us.',
    audienceRule: 'Broad eligible audience; company-on-file data is incomplete.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is an add-on offer for the holiday season, not a verified segment.',
    heroCategory: 'photobooth-rentals',
    gridCategories: ['photobooth-rentals'],
    subject: 'The Easiest Way to Get Everyone in One Photo',
    altSubject: 'Add a Photo Booth to Your Holiday Party',
    preheader: 'A holiday party favorite that sets up in minutes.',
    headline: 'Skip the Group Photo Chaos This Year',
    body: 'Getting a whole office or family together for one photo usually takes ten minutes and a lot of patience. A photo booth solves that - guests use it whenever they want, all night, and everyone leaves with a picture worth keeping.',
    cta: 'Add a Photo Booth',
    ctaPath: '/rentals?category=photobooth-rentals',
    tag: 'holiday-corporate',
    visualStyle: 'professional',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'new-years-eve-events',
    name: 'New Year\'s Eve Event Rentals',
    family: 'seasonal',
    months: [11, 12],
    goal: 'Promote rentals for New Year\'s Eve parties and countdown events.',
    audienceRule: 'Broad eligible audience - general holiday event interest.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - New Year\'s Eve interest is general, not tied to a specific verified segment.',
    heroCategory: 'dance-floor-stage-rentals',
    gridCategories: ['dance-floor-stage-rentals', 'event-lighting-rentals'],
    subject: 'Ring In the New Year With Room to Dance',
    altSubject: 'New Year\'s Eve Rentals, Booked Early',
    preheader: 'A dance floor and lighting for your countdown party.',
    headline: 'Make Room for the Countdown',
    body: 'A New Year\'s Eve party needs a few specific things: enough space to dance, lighting that fits the mood, and seating for the people who would rather watch. We can set up all three in a home, hall, or tent well before your guests arrive.',
    cta: 'Plan Your NYE Party',
    ctaPath: '/rentals?category=dance-floor-stage-rentals',
    tag: 'holiday-corporate',
    visualStyle: 'elegant',
    layoutType: 'editorialLuxury',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
{
    slug: 'corporate-annual-rebooking',
    name: 'Corporate Annual Event Rebooking',
    family: 'lifecycle',
    months: [],
    goal: 'Re-engage companies that booked a corporate event roughly a year ago, ahead of their next annual event.',
    audienceRule: 'Past customers with a company on file whose most recent event was approximately 9-15 months ago.',
    audienceConfidence: 'limited',
    audienceNote: 'Company-on-file data is incomplete, so this sends to the same 9-15 month rebooking window as Annual Rebooking rather than a verified corporate-only list.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'linen-rentals'],
    subject: 'Time to Plan This Year\'s Company Event?',
    altSubject: 'A Note About Your Company\'s Next Event',
    preheader: 'A quick note from Friendly Party Rental.',
    headline: 'Is It Time for This Year\'s Company Event Yet?',
    body: 'It has been about a year since we helped with your company\'s last event. If there is another one on the calendar, we already know roughly what worked well last time and are glad to help you plan the next one.',
    cta: 'Plan This Year\'s Event',
    ctaPath: '/rentals',
    tag: 'holiday-corporate',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'same-season-rebooking',
    name: 'Same-Season Rebooking',
    family: 'lifecycle',
    months: [],
    goal: 'Reach past customers whose event happened in the same season last year, encouraging a repeat booking this year.',
    audienceRule: 'Past customers whose most recent event occurred in the same season one year prior.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order event dates - this is a verified, specific audience, not a broad guess.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Same Time of Year, Ready When You Are',
    altSubject: 'It Is That Time of Year Again',
    preheader: 'A note timed to last year\'s event with us.',
    headline: 'It Is Around the Time You Booked Last Year',
    body: 'Around this time last year, you had an event with us. If this is becoming an annual thing - or if something similar is coming up again - we would love to help make it just as easy this time around.',
    cta: 'Get This Year\'s Quote',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'dormant-18-month-winback',
    name: 'Dormant 18-Month Winback',
    family: 'lifecycle',
    months: [],
    goal: 'A softer second attempt to reconnect with customers who did not respond to the 12-month winback.',
    audienceRule: 'Past customers whose most recent event was 18+ months ago.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order event dates - this is a verified, specific audience, not a broad guess.',
    heroCategory: 'tent-rentals',
    gridCategories: ['party-rental-packages', 'photobooth-rentals'],
    subject: 'No Pressure - Just Checking In',
    altSubject: 'It Has Been a Little While Longer',
    preheader: 'A short note, nothing more.',
    headline: 'Just Checking In - No Pressure',
    body: 'We know it has been a while, and there is no obligation here. If an event ever comes up, big or small, we are still around and happy to help. If not, no worries at all - just wanted to say hello.',
    cta: 'See What We Offer',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'repeat-customer-appreciation',
    name: 'Repeat Customer Appreciation',
    family: 'lifecycle',
    months: [],
    goal: 'Thank customers who have booked with us multiple times, reinforcing loyalty without a hard sell.',
    audienceRule: 'Past customers with more than one completed order.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order history - customers with 2 or more completed orders.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'Thank You for Coming Back to Us',
    altSubject: 'We Noticed - This Isn\'t Your First Event With Us',
    preheader: 'A short thank-you, no strings attached.',
    headline: 'This Isn\'t the First Time - We Noticed',
    body: 'We looked back and realized this isn\'t your first event with us, and we wanted to say thank you. Customers like you are the reason we keep doing this. If there is ever anything we can do better, just reply and let us know.',
    cta: 'Plan Your Next Event',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'high-value-personal-outreach',
    name: 'High-Value Customer Personal Outreach',
    family: 'lifecycle',
    months: [],
    goal: 'A short, personal, low-promotional note to top customers, distinct from bulk campaigns.',
    audienceRule: 'Past customers in the top tier by total spend or order count.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order totals - this is a small, specific, high-value segment, not a broad guess.',
    heroCategory: 'tent-rentals',
    gridCategories: ['party-rental-packages'],
    subject: 'A Quick Personal Note',
    altSubject: 'Thank You for Trusting Us With So Many Events',
    preheader: 'A short message, not a promotion.',
    headline: 'A Quick Note From Our Team',
    body: 'You have trusted us with more events than most, and we do not take that for granted. If there is ever anything we can do better, or anything coming up we should know about, just reply to this email directly - it comes to a real person on our team.',
    cta: 'Reply to This Email',
    ctaPath: '/contact_us',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'past-customer-reengagement',
    name: 'Past Customer General Re-Engagement',
    family: 'lifecycle',
    months: [],
    goal: 'A general-purpose re-engagement email for past customers who do not fit the annual-rebooking or dormant windows.',
    audienceRule: 'Past customers outside the annual-rebooking and dormant-winback windows.',
    audienceConfidence: 'ready',
    audienceNote: 'Calculated directly from real order event dates - this fills the gap between the 9-15 month and 12+ month lifecycle windows.',
    heroCategory: 'tent-rentals',
    gridCategories: ['bounce-house-rentals', 'table-chair-rentals'],
    subject: 'Anything Coming Up We Can Help With?',
    altSubject: 'A Friendly Check-In From Friendly Party Rental',
    preheader: 'A short note from our team.',
    headline: 'Anything on the Calendar We Can Help With?',
    body: 'We like to check in with past customers every so often, just to see if anything is coming up. If you have an event in mind, even a rough idea, we are happy to help you figure out what you would need.',
    cta: 'Tell Us What You Need',
    ctaPath: '/rentals',
    tag: 'lifecycle',
    visualStyle: 'personal',
    layoutType: 'personalLetter',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'tent-spotlight',
    name: 'Tent Spotlight',
    family: 'product',
    months: [],
    goal: 'Educate customers on tent size and style options as a standalone product spotlight.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'tent-rentals',
    gridCategories: ['tent-rentals'],
    subject: 'How to Pick the Right Size Tent',
    altSubject: 'Tents, Explained Simply',
    preheader: 'A quick guide to choosing the right tent for your event.',
    headline: 'The Right Tent Starts With the Right Questions',
    body: 'Guest count, tables versus standing room, and whether you need sidewalls all change which tent makes sense. We walk through those questions with every order so you get a size that actually fits your space, not just the biggest one available.',
    cta: 'Explore Tent Options',
    ctaPath: '/rentals?category=tent-rentals',
    tag: 'product-spotlight',
    visualStyle: 'professional',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
{
    slug: 'tables-chairs-spotlight',
    name: 'Tables & Chairs Spotlight',
    family: 'product',
    months: [],
    goal: 'Highlight table and chair styles and packages available for any event size.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'table-chair-rentals',
    gridCategories: ['table-chair-rentals'],
    subject: 'Not All Tables Are the Same Size',
    altSubject: 'Tables & Chairs, Sized Right',
    preheader: 'Round, rectangular, and everything in between.',
    headline: 'Round or Rectangular Changes More Than You Think',
    body: 'Round tables encourage conversation but fit fewer per square foot. Rectangular tables seat more but change the layout of a room. We keep both in stock along with chairs to match, and can mix styles if your event calls for it.',
    cta: 'See Table & Chair Styles',
    ctaPath: '/rentals?category=table-chair-rentals',
    tag: 'product-spotlight',
    visualStyle: 'professional',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'linen-styling-spotlight',
    name: 'Linen & Event Styling Spotlight',
    family: 'product',
    months: [],
    goal: 'Highlight linen and table styling options as an easy visual upgrade.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'linen-rentals',
    gridCategories: ['linen-rentals'],
    subject: 'The Upgrade Most People Skip',
    altSubject: 'Linens Change the Whole Table',
    preheader: 'Table linens in colors to match your event.',
    headline: 'The Small Upgrade That Changes Every Photo',
    body: 'Bare tables photograph differently than dressed ones. Linens in your color palette are one of the least expensive upgrades available, and they make every other rental - the chairs, the centerpieces, the food - look more intentional.',
    cta: 'Browse Linen Colors',
    ctaPath: '/rentals?category=linen-rentals',
    tag: 'product-spotlight',
    visualStyle: 'elegant',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'yard-games-spotlight',
    name: 'Yard Games & Add-On Spotlight',
    family: 'product',
    months: [],
    goal: 'Promote yard games as an easy, inexpensive add-on to any outdoor event.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'yard-game-rentals',
    gridCategories: ['yard-game-rentals', 'foam-party-machine-rentals'],
    subject: 'The Add-On Guests Remember Most',
    altSubject: 'Give Guests Something to Do Between Meals',
    preheader: 'Yard games that keep guests entertained between courses.',
    headline: 'Something for Guests to Do Between Hellos',
    body: 'Cornhole, giant games, and a foam machine fill the gaps between arriving, eating, and everything else at a party. They cost less than most people expect and are easy to add to an existing order.',
    cta: 'See Yard Games',
    ctaPath: '/rentals?category=yard-game-rentals',
    tag: 'product-spotlight',
    visualStyle: 'energetic',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'concessions-spotlight',
    name: 'Concessions Spotlight',
    family: 'product',
    months: [],
    goal: 'Promote concession machines (popcorn, snow cone, etc.) as a fun add-on.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'concession-machine-rentals',
    gridCategories: ['concession-machine-rentals', 'beverage-food-service'],
    subject: 'Popcorn or Snow Cones? Why Not Both',
    altSubject: 'The Snack Table Guests Actually Visit',
    preheader: 'Concession machines that turn snack time into an activity.',
    headline: 'Turn Snack Time Into Part of the Party',
    body: 'A popcorn or snow cone machine does double duty - it feeds people and gives them something to do while they wait in line. It is a small addition that tends to be the thing kids talk about on the way home.',
    cta: 'See Concession Machines',
    ctaPath: '/rentals?category=concession-machine-rentals',
    tag: 'product-spotlight',
    visualStyle: 'energetic',
    layoutType: 'productShowcase',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'dance-floor-stage-spotlight',
    name: 'Dance Floor & Stage Spotlight',
    family: 'product',
    months: [],
    goal: 'Promote dance floor and staging rentals for weddings, corporate events, and celebrations.',
    audienceRule: 'Broad eligible audience - core product awareness, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is core inventory awareness, not a targeted segment.',
    heroCategory: 'dance-floor-stage-rentals',
    gridCategories: ['dance-floor-stage-rentals'],
    subject: 'Every Great Party Needs Somewhere to Dance',
    altSubject: 'A Dance Floor Changes the Whole Night',
    preheader: 'Portable dance floors and staging for any venue.',
    headline: 'Give the Night Somewhere to Go',
    body: 'A defined dance floor gives a party momentum - it tells guests when it is time to move. Staging works the same way for toasts, speeches, or a band. Both set up on grass, gravel, or indoors, wherever your event is happening.',
    cta: 'See Dance Floor Options',
    ctaPath: '/rentals?category=dance-floor-stage-rentals',
    tag: 'product-spotlight',
    visualStyle: 'elegant',
    layoutType: 'collectionMagazine',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'newly-opened-date',
    name: 'Newly Opened Date', bannerVariant: 'split',
    family: 'opportunity',
    months: [],
    goal: 'Reusable template for when a cancellation or schedule change opens up a specific date (generated by the Marketing Brain, not a fixed calendar date).',
    audienceRule: 'Broad eligible audience; specific date set at campaign creation time based on a real opening.',
    audienceConfidence: 'broad',
    audienceNote: 'Audience is broad by design; the real signal is the specific newly-opened date set at creation, not the audience itself.',
    heroCategory: 'event-lighting-rentals',
    gridCategories: ['tent-rentals', 'table-chair-rentals'],
    subject: 'A Date Just Opened Up',
    altSubject: 'New Availability - First Come, First Served',
    preheader: 'A recent cancellation opened up availability.',
    headline: 'A Date Just Opened Up',
    body: 'A recent schedule change opened up availability we were not expecting to have. If your event could work around this date, it is worth a quick look before it is booked again.',
    cta: 'See This Opening',
    ctaPath: '/rentals',
    tag: 'availability',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
{
    slug: 'last-minute-weekend-opportunity',
    name: 'Last-Minute Weekend Opportunity', bannerVariant: 'band',
    family: 'opportunity',
    months: [],
    goal: 'Fill a specific upcoming weekend that is running behind typical booking pace (generated by the Marketing Brain based on real booking data).',
    audienceRule: 'Broad eligible audience; specific upcoming weekend set at campaign creation time based on real booking pace.',
    audienceConfidence: 'broad',
    audienceNote: 'Audience is broad by design; the real signal is the specific weekend set at creation, based on actual booking pace, not the audience itself.',
    heroCategory: 'inflatable-movie-screen-rentals',
    gridCategories: ['tent-rentals', 'bounce-house-rentals'],
    subject: 'This Weekend Still Has Availability',
    altSubject: 'Planning Something Last Minute?',
    preheader: 'Equipment is still available for this upcoming weekend.',
    headline: 'Last-Minute Plans? This Weekend Is Open',
    body: 'If something came together quickly, we can usually still help. This specific upcoming weekend has more availability than usual, so there is a good chance we can get you what you need even on short notice.',
    cta: 'Check This Weekend',
    ctaPath: '/rentals',
    tag: 'availability',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'underutilized-category-opportunity',
    name: 'Underutilized Category Opportunity', bannerVariant: 'outline',
    family: 'opportunity',
    months: [],
    goal: 'Promote a specific rental category with unusually high current availability (generated by the Marketing Brain based on real inventory utilization).',
    audienceRule: 'Broad eligible audience; specific category set at campaign creation time based on real inventory utilization data.',
    audienceConfidence: 'broad',
    audienceNote: 'Audience is broad by design; the real signal is the specific underutilized category identified at creation, not the audience itself.',
    heroCategory: 'bounce-house-rentals',
    gridCategories: ['bounce-house-rentals'],
    subject: 'More Availability Than Usual on This One',
    altSubject: 'A Category With Extra Availability Right Now',
    preheader: 'One category has more open inventory than usual this month.',
    headline: 'We Have More of This Than Usual Right Now',
    body: 'Our inventory in this category is more available than usual this month, which means better selection and easier scheduling if you have been considering it. Worth a look while the extra availability lasts.',
    cta: 'See What Is Available',
    ctaPath: '/rentals',
    tag: 'availability',
    visualStyle: 'urgency',
    layoutType: 'availabilityUrgency',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'upsell-lighting-addon',
    name: 'Add Lighting to Your Event',
    family: 'product',
    months: [],
    goal: 'Encourage customers with an existing order to add event lighting.',
    audienceRule: 'Broad eligible audience - add-on offer, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a general add-on offer, not a targeted segment.',
    heroCategory: 'event-lighting-rentals',
    gridCategories: ['event-lighting-rentals'],
    subject: 'Already Booked? Here Is an Easy Add-On',
    altSubject: 'Lighting Is Easier to Add Than You Think',
    preheader: 'A simple add-on for your existing order.',
    headline: 'One Add-On That Changes How Everything Looks After Dark',
    body: 'If you already have an order with us, lighting is one of the easiest things to add on - no extra delivery trip, no extra hassle. It is also one of the upgrades people notice most in photos.',
    cta: 'Add Lighting to My Order',
    ctaPath: '/rentals?category=event-lighting-rentals',
    tag: 'upsell',
    visualStyle: 'professional',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'upsell-photobooth-addon',
    name: 'Add a Photo Booth',
    family: 'product',
    months: [],
    goal: 'Encourage customers with an existing order to add a photo booth.',
    audienceRule: 'Broad eligible audience - add-on offer, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a general add-on offer, not a targeted segment.',
    heroCategory: 'photobooth-rentals',
    gridCategories: ['photobooth-rentals'],
    subject: 'Already Booked? Add a Photo Booth',
    altSubject: 'One More Thing Guests Will Thank You For',
    preheader: 'Add a photo booth to your existing order.',
    headline: 'The Add-On Guests Actually Ask For',
    body: 'If you already have equipment reserved with us, adding a photo booth takes one email. It runs itself all night and consistently ends up being the thing guests mention afterward.',
    cta: 'Add a Photo Booth to My Order',
    ctaPath: '/rentals?category=photobooth-rentals',
    tag: 'upsell',
    visualStyle: 'energetic',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'upsell-games-addon',
    name: 'Add Yard Games',
    family: 'product',
    months: [],
    goal: 'Encourage customers with an existing order to add yard games.',
    audienceRule: 'Broad eligible audience - add-on offer, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a general add-on offer, not a targeted segment.',
    heroCategory: 'yard-game-rentals',
    gridCategories: ['yard-game-rentals'],
    subject: 'Already Booked? Add Some Games',
    altSubject: 'Give Guests Something to Do',
    preheader: 'Add yard games to your existing order.',
    headline: 'Fill the Gaps Between Eating and Everything Else',
    body: 'Yard games are inexpensive to add to an order you already have, and they solve one of the harder parts of hosting: what guests do while they wait for everyone else to arrive.',
    cta: 'Add Games to My Order',
    ctaPath: '/rentals?category=yard-game-rentals',
    tag: 'upsell',
    visualStyle: 'energetic',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'upsell-linens-addon',
    name: 'Add Linens & Table Styling',
    family: 'product',
    months: [],
    goal: 'Encourage customers with an existing order to add linens.',
    audienceRule: 'Broad eligible audience - add-on offer, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a general add-on offer, not a targeted segment.',
    heroCategory: 'linen-rentals',
    gridCategories: ['linen-rentals'],
    subject: 'Already Booked? Dress Up Your Tables',
    altSubject: 'One Small Add-On, a More Finished Look',
    preheader: 'Add table linens to your existing order.',
    headline: 'Bare Tables Versus Dressed Tables',
    body: 'If tables and chairs are already part of your order, linens are a small add-on that changes how the whole room looks in photos. Colors are available to match almost any event.',
    cta: 'Add Linens to My Order',
    ctaPath: '/rentals?category=linen-rentals',
    tag: 'upsell',
    visualStyle: 'elegant',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'upsell-extra-seating-addon',
    name: 'Add Extra Tables & Chairs',
    family: 'product',
    months: [],
    goal: 'Encourage customers with an existing order to add extra seating capacity.',
    audienceRule: 'Broad eligible audience - add-on offer, not segment-specific.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad - this is a general add-on offer, not a targeted segment.',
    heroCategory: 'table-chair-rentals',
    gridCategories: ['table-chair-rentals'],
    subject: 'Guest List Growing? Add More Seating',
    altSubject: 'Better to Have a Few Extra Seats Than Not Enough',
    preheader: 'Add extra tables and chairs to your existing order.',
    headline: 'A Few Extra Seats Are Easier to Add Now Than Later',
    body: 'If your guest list has grown since you first booked, adding a few extra tables and chairs to an existing order is simple and often cheaper than a last-minute separate delivery.',
    cta: 'Add Seating to My Order',
    ctaPath: '/rentals?category=table-chair-rentals',
    tag: 'upsell',
    visualStyle: 'professional',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
  {
    slug: 'new-product-launch',
    name: 'New Product or Service Announcement',
    family: 'product',
    months: [],
    goal: 'Reusable template for announcing a new product or service addition to the rental catalog.',
    audienceRule: 'Broad eligible audience - new offering, no purchase history to target by definition.',
    audienceConfidence: 'broad',
    audienceNote: 'Intentionally broad by design - a brand-new product has no purchase history yet to build a verified segment from.',
    heroCategory: 'party-rental-packages',
    gridCategories: ['party-rental-packages'],
    subject: 'Something New Is Available',
    altSubject: 'We Just Added Something to the Catalog',
    preheader: 'A new addition to our rental lineup.',
    headline: 'Something New Just Joined the Lineup',
    body: 'We recently added a new option to what we offer, based on requests from customers planning events like yours. Take a look and let us know if it fits what you have coming up.',
    cta: 'See What Is New',
    ctaPath: '/rentals',
    tag: 'upsell',
    visualStyle: 'professional',
    layoutType: 'announcement',
    contentStatus: 'content-ready',
    designStatus: 'design-ready',
  },
]

export function getCampaignBySlug(slug: string): CampaignDefinition | undefined {
  return CAMPAIGN_LIBRARY.find((c) => c.slug === slug)
}

export function audienceConfidenceLabel(confidence: AudienceConfidence): string {
  if (confidence === 'ready') return 'Ready - Verified Audience'
  if (confidence === 'broad') return 'Broad by Design'
  return 'Limited Data'
}

export function campaignTagLabel(tag: CampaignTag): string {
  const labels: Record<CampaignTag, string> = {
    wedding: 'Wedding',
    graduation: 'Graduation',
    'summer-family': 'Summer & Family',
    fall: 'Fall',
    'holiday-corporate': 'Holiday & Corporate',
    lifecycle: 'Lifecycle',
    'product-spotlight': 'Product Spotlight',
    availability: 'Availability & Opportunity',
    upsell: 'Upsell & Add-On',
  }
  return labels[tag]
}

export function contentStatusLabel(status: ContentStatus): string {
  if (status === 'content-ready') return 'Copy Ready'
  if (status === 'needs-image') return 'Needs Image'
  return 'Needs Audience Review'
}

export function designStatusLabel(status: DesignStatus): string {
  if (status === 'design-ready') return 'Design Ready'
  return 'Needs Layout Review'
}

export function layoutTypeLabel(layout: LayoutType): string {
  const labels: Record<LayoutType, string> = {
    editorialLuxury: 'Editorial Luxury',
    boldSeasonal: 'Bold Seasonal',
    productShowcase: 'Product Showcase',
    corporateEditorial: 'Corporate Editorial',
    personalLetter: 'Personal Letter',
    availabilityUrgency: 'Availability / Urgency',
    collectionMagazine: 'Magazine Collection',
    announcement: 'Announcement',
  }
  return labels[layout]
}

// Curated customer-facing category labels. Internal category slugs (used
// for image lookups and rental-page filtering) should never leak into
// customer-facing copy verbatim - e.g. "heater-fan-rentals" becomes
// "Event Heating", not "heater fan".
const CATEGORY_LABELS: Record<string, string> = {
  'tent-rentals': 'Tents & Canopies',
  'table-chair-rentals': 'Tables & Chairs',
  'bounce-house-rentals': 'Bounce Houses',
  'photobooth-rentals': 'Photo Booth',
  'concession-machine-rentals': 'Concessions',
  'yard-game-rentals': 'Yard Games',
  'linen-rentals': 'Linens & Table Styling',
  'event-lighting-rentals': 'Event Lighting',
  'dance-floor-stage-rentals': 'Dance Floor & Staging',
  'heater-fan-rentals': 'Event Heating',
  'party-rental-packages': 'Event Packages',
  weddings: 'Wedding Rentals',
  'beverage-food-service': 'Beverage & Food Service',
  'foam-party-machine-rentals': 'Foam Parties',
  'generator-rentals': 'Generators',
  'inflatable-movie-screen-rentals': 'Outdoor Movie Screens',
}

export function categoryLabel(slug: string): string {
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug]
  return slug
    .replace(/-rentals$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

// Small eyebrow / section label shown above the main headline in most
// layouts, derived from campaign tag so it reads as intentional editorial
// context rather than a generic promotional blast.
const TAG_EYEBROW: Record<CampaignTag, string> = {
  wedding: 'WEDDING COLLECTION',
  graduation: 'GRADUATION SEASON',
  'summer-family': 'SUMMER EVENTS',
  fall: 'FALL EVENTS',
  'holiday-corporate': 'HOLIDAY & CORPORATE',
  lifecycle: 'A NOTE FROM OUR TEAM',
  'product-spotlight': 'PRODUCT SPOTLIGHT',
  availability: 'AVAILABILITY UPDATE',
  upsell: 'ADD TO YOUR ORDER',
}

const ORIGIN = 'https://www.friendlypartyrentalsc.com'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function heroImg(c: CampaignDefinition) {
  return ORIGIN + '/api/category-image/' + c.heroCategory
}
function categoryImg(slug: string) {
  return ORIGIN + '/api/category-image/' + slug
}
function ctaUrl(c: CampaignDefinition) {
  return ORIGIN + c.ctaPath
}
function catUrl(slug: string) {
  return ORIGIN + '/rentals?category=' + slug
}

function bMasthead(variant: 'standard' | 'minimal' | 'editorial') {
  return { id: uid(), type: 'masthead', variant }
}
function bEyebrow(text: string) {
  return { id: uid(), type: 'eyebrow', text }
}
function bHeading(text: string) {
  return { id: uid(), type: 'heading', text, align: 'center' }
}
function bText(text: string, align: 'left' | 'center' | 'right' = 'left') {
  return { id: uid(), type: 'text', text, align }
}
function bHero(image: string, url: string) {
  return { id: uid(), type: 'hero', image, url }
}
function bButton(text: string, url: string) {
  return { id: uid(), type: 'button', text, url, align: 'center' }
}
function bSplitrow(image: string, title: string, text: string, url: string, side: 'left' | 'right' = 'left') {
  return { id: uid(), type: 'splitrow', image, title, text, url, align: side }
}
function bFeatureRow(title: string, items: { title: string; text: string }[]) {
  return { id: uid(), type: 'featureRow', title, items }
}
function bTrust(title: string, items: string[]) {
  return { id: uid(), type: 'trust', title, items: items.map((t) => ({ title: t, text: '' })) }
}
function bDateBanner(eyebrow: string, text: string, subtitle: string, variant: 'band' | 'outline' | 'split' = 'band') {
  return { id: uid(), type: 'dateBanner', eyebrow, text, subtitle, variant }
}
function bSignature(text: string) {
  return { id: uid(), type: 'signature', text }
}
function bFooterBrand(variant: 'standard' | 'minimal' | 'corporate') {
  return { id: uid(), type: 'footerBrand', variant }
}

function featureItemsFromCategories(cats: string[]): { title: string; text: string }[] {
  const descriptors = ['Delivered & set up', 'Local Upstate South Carolina service', 'Flexible scheduling', 'Easy to add to an order']
  return cats.slice(0, 3).map((slug, i) => ({ title: categoryLabel(slug), text: descriptors[i % descriptors.length] }))
}

function secondCategory(c: CampaignDefinition): string {
  return c.gridCategories[1] || c.gridCategories[0] || c.heroCategory
}

// ---------------------------------------------------------------------------
// LAYOUT BUILDER FUNCTIONS
//
// Each function returns a genuinely different block-sequence (composition),
// not merely the same blocks with different colors. Visual palette/typography
// still comes from VISUAL_THEMES (applied at render time in the builder),
// but the section architecture, hierarchy, and storytelling shape are
// determined here, per layout family.
// ---------------------------------------------------------------------------

function buildEditorialLuxuryBlocks(c: CampaignDefinition) {
  return [
    bMasthead('editorial'),
    bEyebrow(TAG_EYEBROW[c.tag]),
    bHeading(c.headline),
    bHero(heroImg(c), ctaUrl(c)),
    bText(c.body, 'left'),
    bSplitrow(categoryImg(secondCategory(c)), 'What You May Need', 'A few pieces couples ask about most for this part of planning: ' + c.gridCategories.map(categoryLabel).join(', ') + '.', catUrl(secondCategory(c)), 'left'),
    bButton(c.cta, ctaUrl(c)),
    bTrust('Trusted Across Upstate South Carolina', ['Local Greenville-area business', 'Delivery, setup, and pickup included', 'Personal planning support']),
    bFooterBrand('minimal'),
  ]
}

function buildBoldSeasonalBlocks(c: CampaignDefinition) {
  return [
    bMasthead('standard'),
    bEyebrow(TAG_EYEBROW[c.tag]),
    bHeading(c.headline),
    bHero(heroImg(c), ctaUrl(c)),
    bText(c.body, 'center'),
    bFeatureRow('Popular Right Now', featureItemsFromCategories(c.gridCategories)),
    bButton(c.cta, ctaUrl(c)),
    bFooterBrand('standard'),
  ]
}

function buildProductShowcaseBlocks(c: CampaignDefinition) {
  return [
    bMasthead('minimal'),
    bEyebrow('PRODUCT SPOTLIGHT'),
    bHeading(c.headline),
    bHero(heroImg(c), ctaUrl(c)),
    bFeatureRow('Why Customers Add This', featureItemsFromCategories(c.gridCategories.length ? c.gridCategories : [c.heroCategory])),
    bSplitrow(categoryImg(secondCategory(c)), 'Good to Know', c.body, ctaUrl(c), 'right'),
    bButton(c.cta, ctaUrl(c)),
    bFooterBrand('standard'),
  ]
}

function buildCorporateEditorialBlocks(c: CampaignDefinition) {
  return [
    bMasthead('standard'),
    bHero(heroImg(c), ctaUrl(c)),
    bHeading(c.headline),
    bText(c.body, 'left'),
    bFeatureRow('What We Handle', featureItemsFromCategories(c.gridCategories)),
    bButton(c.cta, ctaUrl(c)),
    bFooterBrand('corporate'),
  ]
}

function buildPersonalLetterBlocks(c: CampaignDefinition) {
  return [
    bMasthead('minimal'),
    bEyebrow('A NOTE FROM FRIENDLY PARTY RENTAL'),
    bHeading(c.headline),
    bText(c.body, 'left'),
    bButton(c.cta, ctaUrl(c)),
    bSignature('— The Friendly Party Rental Team'),
    bFooterBrand('minimal'),
  ]
}

function buildAvailabilityUrgencyBlocks(c: CampaignDefinition) {
  const blocks: unknown[] = [
    bMasthead('minimal'),
    bDateBanner('LIMITED AVAILABILITY', c.headline, c.body, c.bannerVariant || 'band'),
    bHero(heroImg(c), ctaUrl(c)),
  ]
  if (c.gridCategories.length) {
    blocks.push(bFeatureRow('Great For', featureItemsFromCategories(c.gridCategories)))
  }
  blocks.push(bButton(c.cta, ctaUrl(c)))
  blocks.push(bFooterBrand('standard'))
  return blocks
}

function buildCollectionMagazineBlocks(c: CampaignDefinition) {
  const cat2 = secondCategory(c)
  return [
    bMasthead('standard'),
    bEyebrow(TAG_EYEBROW[c.tag]),
    bHeading(c.headline),
    bHero(heroImg(c), ctaUrl(c)),
    bSplitrow(categoryImg(c.gridCategories[0] || c.heroCategory), categoryLabel(c.gridCategories[0] || c.heroCategory), c.body, catUrl(c.gridCategories[0] || c.heroCategory), 'left'),
    bSplitrow(categoryImg(cat2), categoryLabel(cat2), c.goal, catUrl(cat2), 'right'),
    bButton(c.cta, ctaUrl(c)),
    bTrust('Why Friendly Party Rental', ['Local Upstate South Carolina business', 'Delivery & setup included']),
    bFooterBrand('standard'),
  ]
}

function buildAnnouncementBlocks(c: CampaignDefinition) {
  return [
    bMasthead('standard'),
    bEyebrow('NEW'),
    bHeading(c.headline),
    bHero(heroImg(c), ctaUrl(c)),
    bText(c.body, 'left'),
    bFeatureRow('What You Get', featureItemsFromCategories(c.gridCategories.length ? c.gridCategories : [c.heroCategory])),
    bButton(c.cta, ctaUrl(c)),
    bFooterBrand('standard'),
  ]
}

const LAYOUT_BUILDERS: Record<LayoutType, (c: CampaignDefinition) => unknown[]> = {
  editorialLuxury: buildEditorialLuxuryBlocks,
  boldSeasonal: buildBoldSeasonalBlocks,
  productShowcase: buildProductShowcaseBlocks,
  corporateEditorial: buildCorporateEditorialBlocks,
  personalLetter: buildPersonalLetterBlocks,
  availabilityUrgency: buildAvailabilityUrgencyBlocks,
  collectionMagazine: buildCollectionMagazineBlocks,
  announcement: buildAnnouncementBlocks,
}

// Builds a blocks array in the shape the Campaign Content builder
// (app/admin/marketing/campaigns/builder) expects, so a library campaign
// opens with real, on-brand, compositionally distinct starter content
// instead of a generic reskinned template. The layoutType on each campaign
// determines the section architecture; VISUAL_THEMES (chosen via
// visualStyle) determines palette/typography on top of that structure.
export function campaignToBlocks(c: CampaignDefinition) {
  const builder = LAYOUT_BUILDERS[c.layoutType] || buildBoldSeasonalBlocks
  return builder(c)
}

export interface VisualThemeTokens {
  key: VisualStyle
  label: string
  pageBg: string
  cardBg: string
  panelBg: string
  headingFont: string
  bodyFont: string
  headingColor: string
  textColor: string
  mutedColor: string
  accent: string
  accentText: string
  borderColor: string
  radius: string
  heroRadius: string
  eyebrowColor: string
  eyebrowBg: string
  letterSpacing: string
}

export const VISUAL_THEMES: Record<VisualStyle, VisualThemeTokens> = {
  elegant: {
    key: 'elegant',
    label: 'Elegant',
    pageBg: '#f7f5f0',
    cardBg: '#fffdfa',
    panelBg: '#f2efe7',
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Georgia, 'Times New Roman', serif",
    headingColor: '#1f2a20',
    textColor: '#3a3a3a',
    mutedColor: '#8a8578',
    accent: '#2d6a2d',
    accentText: '#ffffff',
    borderColor: '#e8e2d5',
    radius: '2px',
    heroRadius: '2px',
    eyebrowColor: '#a98b3f',
    eyebrowBg: 'transparent',
    letterSpacing: '0.5px',
  },
  energetic: {
    key: 'energetic',
    label: 'Energetic',
    pageBg: '#ffffff',
    cardBg: '#ffffff',
    panelBg: '#fff3e8',
    headingFont: 'Arial, Helvetica, sans-serif',
    bodyFont: 'Arial, Helvetica, sans-serif',
    headingColor: '#16321a',
    textColor: '#2a2a2a',
    mutedColor: '#6b7280',
    accent: '#e8720c',
    accentText: '#ffffff',
    borderColor: '#f0d9c2',
    radius: '14px',
    heroRadius: '14px',
    eyebrowColor: '#e8720c',
    eyebrowBg: '#fff3e8',
    letterSpacing: '0.5px',
  },
  professional: {
    key: 'professional',
    label: 'Professional',
    pageBg: '#f4f6fb',
    cardBg: '#ffffff',
    panelBg: '#eef2fb',
    headingFont: 'Arial, Helvetica, sans-serif',
    bodyFont: 'Arial, Helvetica, sans-serif',
    headingColor: '#1a1a1a',
    textColor: '#33383f',
    mutedColor: '#6b7280',
    accent: '#0b3d91',
    accentText: '#ffffff',
    borderColor: '#e5e7eb',
    radius: '4px',
    heroRadius: '6px',
    eyebrowColor: '#0b3d91',
    eyebrowBg: '#eef2fb',
    letterSpacing: '0.3px',
  },
  personal: {
    key: 'personal',
    label: 'Personal',
    pageBg: '#ffffff',
    cardBg: '#ffffff',
    panelBg: '#f7f7f5',
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: 'Arial, Helvetica, sans-serif',
    headingColor: '#1f2a20',
    textColor: '#3a3a3a',
    mutedColor: '#8a8a8a',
    accent: '#2d6a2d',
    accentText: '#ffffff',
    borderColor: '#eeeeee',
    radius: '4px',
    heroRadius: '6px',
    eyebrowColor: '#2d6a2d',
    eyebrowBg: 'transparent',
    letterSpacing: '0px',
  },
  urgency: {
    key: 'urgency',
    label: 'Urgency',
    pageBg: '#fffaf5',
    cardBg: '#ffffff',
    panelBg: '#fdece9',
    headingFont: 'Arial, Helvetica, sans-serif',
    bodyFont: 'Arial, Helvetica, sans-serif',
    headingColor: '#1a1a1a',
    textColor: '#2a2a2a',
    mutedColor: '#6b7280',
    accent: '#c0392b',
    accentText: '#ffffff',
    borderColor: '#f3c9c2',
    radius: '6px',
    heroRadius: '8px',
    eyebrowColor: '#c0392b',
    eyebrowBg: '#fdece9',
    letterSpacing: '1px',
  },
}

export function visualStyleLabel(style: VisualStyle): string {
  return VISUAL_THEMES[style].label
}
