import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join the Friendly Party Rental team in Syracuse, NY. We are hiring event coordinators, delivery drivers, customer service representatives, and event setup crew.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/employment' },
}

export default function EmploymentLayout({ children }: { children: React.ReactNode }) {
  return children
}

