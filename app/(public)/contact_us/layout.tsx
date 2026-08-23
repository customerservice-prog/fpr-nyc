import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Friendly Party Rental at 315-884-1498 to book party rentals in Greenville, SC and the Upstate. Get a fast response for tents, tables, chairs, and event equipment.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/contact_us' },
}

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children
}

