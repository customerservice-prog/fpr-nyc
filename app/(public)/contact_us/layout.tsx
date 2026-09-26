import { scPageMetadata } from '@/lib/scSeo'
import type { Metadata } from 'next'

export const metadata = scPageMetadata("/contact_us","Contact Friendly Party Rental \u2014 Greenville, SC","Call or text 864-610-5324 for Greenville party rental quotes, delivery questions and event help. Shared inbox: customerservice@friendlypartyrental.com.",true)

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children
}

