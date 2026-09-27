import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/gallery","Party Rental Gallery & Event Inspiration","Browse shared Friendly Party Rental brand photos and event inspiration. Shared New York images are labeled; Greenville equipment and availability may differ.",true)

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}

