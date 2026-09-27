import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/wedding-packages","Wedding Package Selection \u2014 Riverdale, Bronx, NY","Choose a Riverdale wedding rental package for your event date. See the Weddings page for package information and listed inclusions.",false)

export default function WeddingPackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}

