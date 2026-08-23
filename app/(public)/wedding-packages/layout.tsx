import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wedding Rental Packages',
  description: 'Compare all-inclusive wedding rental packages from Friendly Party Rental, from backyard elopements to large receptions, with tents, chairs, linens, lighting, and setup included.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/wedding-packages' },
    robots: { index: false, follow: true },
}

export default function WeddingPackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}

