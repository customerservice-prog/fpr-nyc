import type { Metadata } from 'next'
import { nycUrl } from '@/lib/nycSeo'
import PlanningPage from '@/components/public/PlanningPage'
export const metadata: Metadata = {
  title: 'Event Planning & Coordination in Riverdale, Bronx, NY',
  description: 'Plan your wedding, corporate event, private party or fundraiser with Friendly Party Rental NYC. Local rentals, layout guidance and event coordination. Request a free consultation.',
  alternates: { canonical: nycUrl('/event-planning') },
  openGraph: { title: 'Event Planning & Coordination in Riverdale, Bronx, NY', description: 'One team for your rentals, layout and event coordination.', url: nycUrl('/event-planning'), images: ['/images/event-planning/tent-patio-setup/image.png'] },
}
export default function EventPlanningPage() { return <PlanningPage/> }
