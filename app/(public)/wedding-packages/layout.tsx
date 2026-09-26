import { scPageMetadata } from '@/lib/scSeo'
import type { Metadata } from 'next'

export const metadata = scPageMetadata("/wedding-packages","Wedding Package Selection \u2014 Greenville, SC","Choose a Greenville wedding rental package for your event date. See the Weddings page for package information and listed inclusions.",false)

export default function WeddingPackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}

