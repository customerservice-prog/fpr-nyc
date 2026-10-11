import { nycPageMetadata } from '@/lib/nycSeo'

export const metadata = nycPageMetadata('/design-your-event/book', 'Review Your RentSketch Rentals', 'Review the date, selected equipment and current rental prices for your saved NYC event plan.', false)

export default function DesignBookingLayout({ children }: { children: React.ReactNode }) {
  return children
}
