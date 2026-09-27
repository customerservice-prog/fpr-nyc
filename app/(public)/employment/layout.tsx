import { nycPageMetadata } from '@/lib/nycSeo'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/employment","Careers at Friendly Party Rental \u2014 Riverdale, Bronx, NY","Explore opportunities with the Friendly Party Rental team serving Riverdale and Downstate New York. View the current application information.",true)

export default function EmploymentLayout({ children }: { children: React.ReactNode }) {
  return children
}

