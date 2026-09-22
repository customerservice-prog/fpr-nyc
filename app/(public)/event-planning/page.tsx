import type { Metadata } from 'next'
import PlanningPage from '@/components/public/PlanningPage'
export const metadata: Metadata = {
  title: 'Event Planning & Coordination in Greenville, SC',
  description: 'Plan your wedding, corporate event, private party or fundraiser with Friendly Party Rental SC. Local rentals, layout guidance and event coordination. Request a free consultation.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/event-planning' },
  openGraph: { title: 'Event Planning & Coordination in Greenville, SC', description: 'One team for your rentals, layout and event coordination.', url: 'https://www.friendlypartyrentalsc.com/event-planning', images: ['/images/event-planning/tent-patio-setup/image.png'] },
}
export default function EventPlanningPage() { return <PlanningPage/> }
