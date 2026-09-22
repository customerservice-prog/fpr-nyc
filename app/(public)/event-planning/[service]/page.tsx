import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { planningServices, PLANNING_ORIGIN } from '@/lib/eventPlanning'
import PlanningPage from '@/components/public/PlanningPage'
type Props = { params: Promise<{ service: string }> }
export function generateStaticParams() { return planningServices.map(service => ({ service: service.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service: slug } = await params
  const service = planningServices.find(s => s.slug === slug)
  if (!service) return { title: 'Planning service not found', robots: { index: false } }
  const url = PLANNING_ORIGIN + '/event-planning/' + service.slug
  return { title: service.title, description: service.summary, alternates: { canonical: url }, openGraph: { title: service.title, description: service.summary, url, images: [service.image] } }
}
export default async function ServicePage({ params }: Props) {
  const { service: slug } = await params
  const service = planningServices.find(s => s.slug === slug)
  if (!service) notFound()
  return <PlanningPage service={service}/>
}
