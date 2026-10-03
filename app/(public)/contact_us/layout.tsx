import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata: Metadata = nycPageMetadata(
  '/contact_us',
  'Contact Friendly Party Rental NYC | Bronx & Lower Westchester',
  'Contact Friendly Party Rental NYC for tents, tables, chairs, inflatables, wedding rentals and event equipment delivery in Riverdale, selected Bronx neighborhoods and Lower Westchester.',
  true
)

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children
}
