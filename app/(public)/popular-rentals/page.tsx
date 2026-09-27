import PopularRentalsShared from '@/components/public/PopularRentalsShared'
import { nycPageMetadata } from '@/lib/nycSeo'

export const revalidate = 60
export const metadata = nycPageMetadata(
  '/popular-rentals',
  'Popular Party Rentals in Riverdale, Bronx, NY',
  'Browse party rentals booked most often across recent Riverdale orders. Check tents, inflatables, seating, photo booths, dance floors and other customer favorites, then verify availability for your event date.'
)

export default function PopularRentalsPage() {
  return <PopularRentalsShared/>
}
