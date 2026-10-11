import { nycPageMetadata } from '@/lib/nycSeo'

export const metadata = nycPageMetadata('/my-order', 'My Order — Friendly Party Rental NYC', 'Securely view your NYC reservation and request help from the Riverdale team.', false)

export default function MyOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
