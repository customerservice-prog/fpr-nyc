import { notFound } from 'next/navigation'
import { planningServices } from '@/lib/eventPlanning'
import PlanningPage from '@/components/public/PlanningPage'
import { nycPageMetadata, nycBreadcrumbs } from '@/lib/nycSeo'
import { safeJsonLd } from '@/lib/jsonLd'
type Props = { params: Promise<{ service: string }> }
export function generateStaticParams() { return planningServices.map(service => ({ service: service.slug })) }
export async function generateMetadata({ params }: Props) {
  const { service: slug } = await params
  const service = planningServices.find(s => s.slug === slug)
  if (!service) return { title: 'Planning service not found', robots: { index: false, follow: true } }
  const description = service.summary + ' Serving Riverdale, selected Bronx neighborhoods and Lower Westchester.'
  return nycPageMetadata('/event-planning/'+service.slug,service.title,description)
}
export default async function ServicePage({ params }: Props) {
  const { service: slug } = await params
  const service = planningServices.find(s => s.slug === slug)
  if (!service) notFound()
  const path='/event-planning/'+service.slug
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(nycBreadcrumbs([{name:'Home',path:'/'},{name:'Event Planning',path:'/event-planning'},{name:service.label,path}]))}}/>
    <PlanningPage service={service}/>
  </>
}
