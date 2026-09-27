import { scPageMetadata } from '@/lib/scSeo'
import type { Metadata } from 'next'

export const metadata = scPageMetadata("/employment","Careers at Friendly Party Rental \u2014 Riverdale, Bronx, NY","Explore opportunities with the Friendly Party Rental team serving Riverdale and Downstate New York. View the current application information.",true)

export default function EmploymentLayout({ children }: { children: React.ReactNode }) {
  return children
}

