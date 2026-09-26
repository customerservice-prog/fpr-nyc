import { scPageMetadata } from '@/lib/scSeo'
import type { Metadata } from 'next'

export const metadata = scPageMetadata("/order-by-date","Check Party Rental Availability \u2014 Greenville, SC","Choose your event date to browse Greenville party rental availability. Reserve tents, tables, chairs and equipment with delivery to Upstate South Carolina events.",true)

export default function OrderByDateLayout({ children }: { children: React.ReactNode }) {
  return children
}

