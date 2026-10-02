import { nycPageMetadata } from '@/lib/nycSeo'
import PlanningPage from '@/components/public/PlanningPage'
export const metadata = nycPageMetadata(
  '/event-planning',
  'Event Planning & Coordination | Riverdale, Bronx & Lower Westchester',
  'Plan weddings, corporate events, private parties, festivals and fundraisers with Friendly Party Rental NYC. Combine rentals, layouts and coordination across Riverdale, the Bronx and Lower Westchester.'
)
export default function EventPlanningPage() { return <PlanningPage/> }
