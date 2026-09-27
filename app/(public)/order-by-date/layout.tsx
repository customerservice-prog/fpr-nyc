import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/order-by-date","Check Party Rental Availability \u2014 Riverdale, NY","Choose your event date to browse Greenville party rental availability. Reserve tents, tables, chairs and equipment with delivery to Downstate New York events.",true)

export default function OrderByDateLayout({ children }: { children: React.ReactNode }) {
  return children
}

