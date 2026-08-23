import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Party Rentals by Date',
  description: 'Select your event date and browse available party rental inventory in Syracuse, NY and Central New York. Book tents, tables, chairs, and more online with Friendly Party Rental.',
  alternates: {
    canonical: 'https://www.friendlypartyrental.com/order-by-date',
  },
}

export default function OrderByDateLayout({ children }: { children: React.ReactNode }) {
  return children
}

