import { scPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = scPageMetadata("/employment","Careers at Friendly Party Rental \u2014 Greenville, SC","Explore opportunities with the Friendly Party Rental team serving Greenville and Upstate South Carolina. View the current application information.",true)

export default function EmploymentLayout({ children }: { children: React.ReactNode }) {
  return children
}

