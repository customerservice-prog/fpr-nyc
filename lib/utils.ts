import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const utcSafe = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    return format(utcSafe, 'MMM d, yyyy')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

// Alias for backward compatibility
export const formatDateShort = formatDate

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `FPR-${timestamp}-${random}`
}

export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `QT-${timestamp}-${random}`
}

export function calculateTax(amount: number, rate: number = 0.08): number {
  return Math.round(amount * rate * 100) / 100
}

export function calculateTotal(subtotal: number, tax: number, delivery: number = 0): number {
  return Math.round((subtotal + tax + delivery) * 100) / 100
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function parseAmount(value: string | number): number {
  if (typeof value === 'number') return value
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
}

export const BUSINESS = {
  name: 'Friendly Party Rental',
  legalName: 'Friendly Party Rental L.L.C.',
  phone: '315-884-1498',
  text: '315-884-1498',
  email: 'customerservice@friendlypartyrental.com',
  address: '330 Costello Parkway, Minoa, NY 13116',
  serviceArea: 'Syracuse & Nearby Cities',
  hours: 'Mon-Fri: 8am-6pm, Sat: 8am-4pm, Sun: By Appointment',
  facebook: 'https://www.facebook.com/friendlypartyrental',
  instagram: 'https://www.instagram.com/friendlypartyrental',
  youtube: 'https://www.youtube.com/channel/friendlypartyrental',
  yelp: 'https://www.yelp.com/biz/friendly-party-rental',
  tiktok: 'https://www.tiktok.com/@friendlypartyrental',
  twitter: 'https://twitter.com/friendlypartyrent',
  mapUrl: 'https://maps.google.com/?q=330+Costello+Parkway+Minoa+NY+13116',
}

export const NAV_RENTALS = [
  { name: 'Order by Date', href: '/order-by-date' },
  { name: 'Browse All Rentals', href: '/category' },
  { separator: true },
  { name: 'Tables & Chairs', href: '/category/table-chair-rentals' },
  { name: 'Tents', href: '/category/tent-rentals' },
  { name: 'Dance Floor & Stage', href: '/category/dance-floor-stage-rentals' },
  { name: 'Package Deals', href: '/category/party-rental-packages' },
  { name: 'Beverage & Food Service', href: '/category/beverage-food-service' },
  { name: 'Heating & Cooling', href: '/category/heater-fan-rentals' },
  { name: 'Linens', href: '/category/linen-rentals' },
  { name: 'Concessions', href: '/category/concession-machine-rentals' },
  { name: 'Yard Games', href: '/category/yard-game-rentals' },
  { name: 'Lighting', href: '/category/event-lighting-rentals' },
  { name: 'Generators', href: '/category/generator-rentals' },
  { name: 'Photobooth', href: '/category/photobooth-rentals' },
  { name: 'Foam Machine', href: '/category/foam-party-machine-rentals' },
  { name: 'Inflatable Movie Screen', href: '/category/inflatable-movie-screen-rentals' },
  { name: 'Bounce Houses & Waterslides', href: '/category/bounce-house-rentals' },
  { name: 'Weddings', href: '/category/weddings' },
  { name: 'Accessories', href: '/category/party-rental-accessories' },
  { name: 'All Rentals', href: '/category' },
  ]

export const PUBLIC_CATEGORIES = [
  {
        id: 'order-by-date',
        name: 'Order-by-Date',
        slug: 'order-by-date',
        href: '/order-by-date',
        image: '/images/order-by-date.png',
        count: 0,
  },
  {
        id: 'bounce-house-rentals',
        name: 'Bounce House Rentals — Syracuse, NY',
        slug: 'bounce-house-rentals',
        href: '/category/bounce-house-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Mar-10--2026--04_18_04-PM.png',
        count: 12,
  },
  {
        id: 'tent-rentals',
        name: 'Tent Rentals — Syracuse, NY',
        slug: 'tent-rentals',
        href: '/category/tent-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_38_16-AM.png',
        count: 6,
  },
  {
        id: 'table-chair-rentals',
        name: 'Table & Chair Rentals — Syracuse, NY',
        slug: 'table-chair-rentals',
        href: '/category/table-chair-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_38_40-AM.png',
        count: 15,
  },
  {
        id: 'concession-machine-rentals',
        name: 'Concession Machine Rentals — Syracuse, NY',
        slug: 'concession-machine-rentals',
        href: '/category/concession-machine-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_42_03-AM.png',
        count: 9,
  },
  {
        id: 'generator-rentals',
        name: 'Generator Rentals — Syracuse, NY',
        slug: 'generator-rentals',
        href: '/category/generator-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_40_58-AM.png',
        count: 4,
  },
  {
        id: 'yard-game-rentals',
        name: 'Yard Game Rentals — Syracuse, NY',
        slug: 'yard-game-rentals',
        href: '/category/yard-game-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_37_29-AM.png',
        count: 5,
  },
  {
        id: 'photobooth-rentals',
        name: 'Photobooth Rentals — Syracuse, NY',
        slug: 'photobooth-rentals',
        href: '/category/photobooth-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_39_03-AM.png',
        count: 3,
  },
  {
        id: 'foam-party-machine-rentals',
        name: 'Foam Party Machine Rentals — Syracuse, NY',
        slug: 'foam-party-machine-rentals',
        href: '/category/foam-party-machine-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_48_33-AM.png',
        count: 2,
  },
  {
        id: 'event-lighting-rentals',
        name: 'Event Lighting Rentals — Syracuse, NY',
        slug: 'event-lighting-rentals',
        href: '/category/event-lighting-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_40_24-AM.png',
        count: 4,
  },
  {
        id: 'linen-rentals',
        name: 'Linen & Tablecloth Rentals — Syracuse, NY',
        slug: 'linen-rentals',
        href: '/category/linen-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_40_05-AM.png',
        count: 6,
  },
  {
        id: 'dance-floor-stage-rentals',
        name: 'Dance Floor & Stage Rentals — Syracuse, NY',
        slug: 'dance-floor-stage-rentals',
        href: '/category/dance-floor-stage-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_41_14-AM.png',
        count: 3,
  },
  {
        id: 'heater-fan-rentals',
        name: 'Heater & Fan Rentals — Syracuse, NY',
        slug: 'heater-fan-rentals',
        href: '/category/heater-fan-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_47_00-AM.png',
        count: 4,
  },
  {
        id: 'inflatable-movie-screen-rentals',
        name: 'Inflatable Movie Screen Rentals — Syracuse, NY',
        slug: 'inflatable-movie-screen-rentals',
        href: '/category/inflatable-movie-screen-rentals',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_49_44-AM.png',
        count: 2,
  },
  {
        id: 'beverage-food-service',
        name: 'Beverage & Food Service Rentals — Syracuse, NY',
        slug: 'beverage-food-service',
        href: '/category/beverage-food-service',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_44_30-AM.png',
        count: 5,
  },
  {
        id: 'party-rental-packages',
        name: 'Party Rental Packages — Syracuse, NY',
        slug: 'party-rental-packages',
        href: '/category/party-rental-packages',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Dec-19--2025--10_39_22-AM.png',
        count: 6,
  },
  {
        id: 'weddings',
        name: 'Weddings',
        slug: 'weddings',
        href: '/category/weddings',
        image: 'https://315.ourers.com/cp/upload/315/categories/victoria-grady_r-tagg-2546-2.jpg',
        count: 6,
  },
  {
        id: 'party-rental-accessories',
        name: 'Party Rental Accessories — Syracuse, NY',
        slug: 'party-rental-accessories',
        href: '/category/party-rental-accessories',
        image: 'https://315.ourers.com/cp/upload/315/categories/ChatGPT-Image-Jun-9--2026--05_10_38-AM.png',
        count: 8,
  },
  ]

export const WEDDING_PACKAGES = [
  {
    id: 'pkg-basic',
    image: '/images/wedding-backyard-elopement.jpg',
    name: 'Backyard Elopement',
    description: 'Perfect for intimate gatherings. Includes tent, tables, chairs, and basic lighting.',
    price: 345,
    guests: 30,
    popular: false,
    signature: false,
    items: [
      '20x20 White Tent',
      '3 Round Tables',
      '30 Folding Chairs',
      'Basic String Lighting',
      'Setup & Breakdown',
    ],
  },
  {
    id: 'pkg-standard',
    image: 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_43_21-AM.png',
    name: 'Classic Ceremony',
    description: 'Great for medium-sized weddings with additional decor and seating.',
    price: 520,
    guests: 50,
    popular: false,
    signature: false,
    items: [
      '20x40 White Tent',
      '5 Round Tables',
      '50 Folding Chairs',
      'String Lighting',
      'Dance Floor',
      'Setup & Breakdown',
    ],
  },
  {
    id: 'pkg-premium',
    image: 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_51_33-AM.png',
    name: 'Garden Reception',
    description: 'Ideal for larger weddings with premium furnishings and full decor.',
    price: 2380,
    guests: 80,
    popular: true,
    signature: false,
    items: [
      '40x60 White Tent',
      '10 Round Tables',
      '100 Chiavari Chairs',
      'Chandelier Lighting',
      'Dance Floor',
      'Photo Booth',
      'Setup & Breakdown',
    ],
  },
  {
    id: 'pkg-luxury',
    image: 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--05_53_36-AM.png',
    name: 'Luxury Estate',
    description: 'A full reception experience with elegant furnishings and premium decor.',
    price: 5165,
    guests: 125,
    popular: false,
    signature: false,
    items: [
      '40x80 White Tent',
      '15 Round Tables',
      '150 Chiavari Chairs',
      'Full Lighting Package',
      'Dance Floor',
      'Photo Booth',
      'Concession Station',
      'Dedicated Coordinator',
      'Setup & Breakdown',
    ],
  },
  {
    id: 'pkg-elite',
    image: 'https://files.sysers.com/cp/upload/315/items/med/ChatGPT-Image-Jun-8--2026--06_14_30-AM.png',
    name: 'All-Inclusive Premium',
    description: 'The ultimate wedding experience with every amenity included.',
    price: 6925,
    guests: 200,
    popular: false,
    signature: true,
    items: [
      'Custom Tent Configuration',
      '25 Round Tables',
      '250 Chiavari Chairs',
      'Premium Lighting Package',
      'Multiple Dance Floors',
      'Photo Booth',
      'Full Concession Package',
      'Dedicated Event Team',
      'Custom Decor',
      'Setup & Breakdown',
    ],
  },
]

export const REVIEWS = [
  {
        id: 'review-1',
        author: 'Larissa B.',
        rating: 5,
        date: '2026-06-22',
        text: 'This company was easy to work with and the tent was fantastic. We even had a Tornado Watch the day after they put the tent up, and I was so nervous, but it stayed in place! The installers were professional and helpful, and quick. I would definitely recommend this company to others.',
        source: 'Google',
  },
  {
        id: 'review-2',
        author: 'M C',
        rating: 5,
        date: '2026-06-15',
        text: 'Excellent services! Highly recommend - I needed something quick for a bday party, my daughter recommended him last minute so I messaged Jacob and he answered in a timely manner, came out the same day, did an absolutely amazing job setting up, very kind and courteous. Extremely great service.',
        source: 'Google',
  },
  {
        id: 'review-3',
        author: 'Jennie Karoleski',
        rating: 5,
        date: '2026-06-11',
        text: 'This was our first time hiring Friendly Party Rentals and everything went very smoothly. We ordered 24 of the Resin chairs with pads and 2 tables. The items were in good condition and delivered on time. I would definitely rent from Friendly Party Rental, price was very fair for delivery and pick up.',
        source: 'Google',
  },
  {
        id: 'review-4',
        author: 'Angela Radakovich',
        rating: 5,
        date: '2026-06-04',
        text: 'Working with Friendly Party Rental to rent some chairs for our graduation party was very easy, even though we live out of town. Nicole was an excellent communicator and helped us with a smooth pick up and drop off. Thanks!!',
        source: 'Google',
  },
  {
        id: 'review-5',
        author: 'Lainie Cox',
        rating: 5,
        date: '2026-06-04',
        text: 'We used them for a big graduation party at Syracuse this past weekend and they were so amazing and easy to work with!!! Highly recommend!!!',
        source: 'Google',
  },
  {
        id: 'review-6',
        author: 'Mary McCormick',
        rating: 5,
        date: '2026-06-03',
        text: 'Excellent service and communication. Would highly recommend.',
        source: 'Google',
  },
  {
        id: 'review-7',
        author: 'Bonnie Brown',
        rating: 5,
        date: '2026-06-03',
        text: 'Reliable and responsive.',
        source: 'Google',
  },
  {
        id: 'review-8',
        author: 'Rose Talavera-Wright',
        rating: 5,
        date: '2026-06-02',
        text: 'We rented chairs for my gender reveal which ended early due to weather but they were on time and came early to pick the chairs up which was super helpful! We will be renting again!!',
        source: 'Google',
  },
  ]
