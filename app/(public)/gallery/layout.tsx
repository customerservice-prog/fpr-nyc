import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'See real party rental setups from Friendly Party Rental including tents, tables, chairs, and more from birthdays, weddings, and graduations across Greenville and Upstate South Carolina.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/gallery' },
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}

