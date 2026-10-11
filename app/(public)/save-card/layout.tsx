import { nycPageMetadata } from '@/lib/nycSeo'

export const metadata = nycPageMetadata('/save-card', 'Secure Payment Method Authorization', 'Authorize a payment method for your existing Friendly Party Rental NYC reservation.', false)

export default function SaveCardLayout({ children }: { children: React.ReactNode }) {
  return children
}
