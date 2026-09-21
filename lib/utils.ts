import { SC_CATEGORY_IMAGES } from '@/lib/scCategoryImages'
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
  phone: '864-610-5324',
  text: '864-610-5324',
  email: 'customerservice@friendlypartyrental.com',
  emailHref: 'mailto:customerservice@friendlypartyrental.com?subject=%5BSouth%20Carolina%5D%20Greenville%20rental%20inquiry',
  address: 'Greenville, SC',
  serviceArea: 'Greenville & Nearby Upstate SC Cities',
  hours: 'Mon-Fri: 8am-6pm, Sat: 8am-4pm, Sun: By Appointment',
  facebook: 'https://www.facebook.com/friendlypartyrental',
  instagram: 'https://www.instagram.com/friendlypartyrental',
  youtube: 'https://www.youtube.com/channel/friendlypartyrental',
  yelp: 'https://www.yelp.com/biz/friendly-party-rental',
  tiktok: 'https://www.tiktok.com/@friendlypartyrental',
  twitter: 'https://twitter.com/friendlypartyrent',
  mapUrl: 'https://maps.google.com/?q=Greenville+SC',
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
        image: SC_CATEGORY_IMAGES['order-by-date'],
        count: 0,
  },
  {
        id: 'bounce-house-rentals',
        name: 'Bounce House Rentals — Greenville, SC',
        slug: 'bounce-house-rentals',
        href: '/category/bounce-house-rentals',
        image: SC_CATEGORY_IMAGES['bounce-house-rentals'],
        count: 15,
  },
  {
        id: 'tent-rentals',
        name: 'Tent Rentals — Greenville, SC',
        slug: 'tent-rentals',
        href: '/category/tent-rentals',
        image: SC_CATEGORY_IMAGES['tent-rentals'],
        count: 22,
  },
  {
        id: 'table-chair-rentals',
        name: 'Table & Chair Rentals — Greenville, SC',
        slug: 'table-chair-rentals',
        href: '/category/table-chair-rentals',
        image: SC_CATEGORY_IMAGES['table-chair-rentals'],
        count: 14,
  },
  {
        id: 'concession-machine-rentals',
        name: 'Concession Machine Rentals — Greenville, SC',
        slug: 'concession-machine-rentals',
        href: '/category/concession-machine-rentals',
        image: SC_CATEGORY_IMAGES['concession-machine-rentals'],
        count: 17,
  },
  {
        id: 'generator-rentals',
        name: 'Generator Rentals — Greenville, SC',
        slug: 'generator-rentals',
        href: '/category/generator-rentals',
        image: SC_CATEGORY_IMAGES['generator-rentals'],
        count: 3,
  },
  {
        id: 'yard-game-rentals',
        name: 'Yard Game Rentals — Greenville, SC',
        slug: 'yard-game-rentals',
        href: '/category/yard-game-rentals',
        image: SC_CATEGORY_IMAGES['yard-game-rentals'],
        count: 9,
  },
  {
        id: 'photobooth-rentals',
        name: 'Photobooth Rentals — Greenville, SC',
        slug: 'photobooth-rentals',
        href: '/category/photobooth-rentals',
        image: SC_CATEGORY_IMAGES['photobooth-rentals'],
        count: 5,
  },
  {
        id: 'foam-party-machine-rentals',
        name: 'Foam Party Machine Rentals — Greenville, SC',
        slug: 'foam-party-machine-rentals',
        href: '/category/foam-party-machine-rentals',
        image: SC_CATEGORY_IMAGES['foam-party-machine-rentals'],
        count: 1,
  },
  {
        id: 'event-lighting-rentals',
        name: 'Event Lighting Rentals — Greenville, SC',
        slug: 'event-lighting-rentals',
        href: '/category/event-lighting-rentals',
        image: SC_CATEGORY_IMAGES['event-lighting-rentals'],
        count: 17,
  },
  {
        id: 'linen-rentals',
        name: 'Linen & Tablecloth Rentals — Greenville, SC',
        slug: 'linen-rentals',
        href: '/category/linen-rentals',
        image: SC_CATEGORY_IMAGES['linen-rentals'],
        count: 36,
  },
  {
        id: 'dance-floor-stage-rentals',
        name: 'Dance Floor & Stage Rentals — Greenville, SC',
        slug: 'dance-floor-stage-rentals',
        href: '/category/dance-floor-stage-rentals',
        image: SC_CATEGORY_IMAGES['dance-floor-stage-rentals'],
        count: 6,
  },
  {
        id: 'heater-fan-rentals',
        name: 'Heater & Fan Rentals — Greenville, SC',
        slug: 'heater-fan-rentals',
        href: '/category/heater-fan-rentals',
        image: SC_CATEGORY_IMAGES['heater-fan-rentals'],
        count: 8,
  },
  {
        id: 'inflatable-movie-screen-rentals',
        name: 'Inflatable Movie Screen Rentals — Greenville, SC',
        slug: 'inflatable-movie-screen-rentals',
        href: '/category/inflatable-movie-screen-rentals',
        image: SC_CATEGORY_IMAGES['inflatable-movie-screen-rentals'],
        count: 2,
  },
  {
        id: 'beverage-food-service',
        name: 'Beverage & Food Service Rentals — Greenville, SC',
        slug: 'beverage-food-service',
        href: '/category/beverage-food-service',
        image: SC_CATEGORY_IMAGES['beverage-food-service'],
        count: 46,
  },
  {
        id: 'party-rental-packages',
        name: 'Party Rental Packages — Greenville, SC',
        slug: 'party-rental-packages',
        href: '/category/party-rental-packages',
        image: SC_CATEGORY_IMAGES['party-rental-packages'],
        count: 13,
  },
  {
        id: 'weddings',
        name: 'Weddings',
        slug: 'weddings',
        href: '/category/weddings',
        image: SC_CATEGORY_IMAGES['weddings'],
        count: 23,
  },
  {
        id: 'party-rental-accessories',
        name: 'Party Rental Accessories — Greenville, SC',
        slug: 'party-rental-accessories',
        href: '/category/party-rental-accessories',
        image: SC_CATEGORY_IMAGES['party-rental-accessories'],
        count: 6,
  },
  {
    id: 'restroom-rentals',
    name: 'Restroom Rentals — Greenville, SC',
    slug: 'restroom-rentals',
    href: '/category/restroom-rentals',
    image: SC_CATEGORY_IMAGES['restroom-rentals'],
    count: 2,
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

export const REVIEWS: Array<{ id: string; author: string; rating: number; date: string; text: string; source: string }> = []

export function calculateReturnDateInfo(eventDateStr: string, minDays: number, maxDays: number | null): string {
  const base = new Date(eventDateStr)
    if (isNaN(base.getTime())) return ''
      if (minDays <= 1 && (maxDays ?? 1) <= 1) return ''
        if (maxDays === null) return `${minDays}+ days - exact return date will be confirmed with you`
          const minReturn = new Date(base)
            minReturn.setDate(minReturn.getDate() + (minDays - 1))
              if (minDays === maxDays) return `Return: ${formatDate(minReturn)}`
                const maxReturn = new Date(base)
                  maxReturn.setDate(maxReturn.getDate() + (maxDays - 1))
                    return `Return: approximately ${formatDate(minReturn)} - ${formatDate(maxReturn)}`
}
