import PopularRentalsShared from '@/components/public/PopularRentalsShared'
import { scPageMetadata } from '@/lib/scSeo'

export const revalidate = 60
export const metadata = scPageMetadata(
  '/popular-rentals',
  'Popular Party Rentals in Riverdale, Bronx, NY',
  'Browse party rentals booked most often across recent Riverdale orders. Check tents, inflatables, seating, photo booths, dance floors and other customer favorites, then verify availability for your event date.'
)

export default function PopularRentalsPage() {
  return <PopularRentalsShared/>
}
