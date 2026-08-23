import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join the Friendly Party Rental team in Greenville, SC. We are hiring event coordinators, delivery drivers, customer service representatives, and event setup crew.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/employment' },
}

export default function EmploymentLayout({ children }: { children: React.ReactNode }) {
  return children
}

