import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/contact_us","Contact Friendly Party Rental \u2014 Riverdale, Bronx, NY","Call or text 315-884-1498 for Riverdale party rental quotes, delivery questions and event help. Shared inbox: customerservice@friendlypartyrental.com.",true)

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children
}

