import Link from 'next/link'
import { getCategoryPlanningContent } from '@/lib/categoryPlanningContent'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'
import { NYC_LOCAL_PLANNING } from '@/lib/nycLocalPlanningResources'

export default function CategoryPlanningGuide({ slug, name }: { slug: string; name: string }) {
  const guide = getCategoryPlanningContent(slug, name)
  const verifiedAreas = NYC_SERVICE_AREAS.filter(area => Boolean(NYC_LOCAL_PLANNING[area.slug]))
  return (
    <section className="max-w-4xl mx-auto px-4 pb-16" aria-labelledby="nyc-category-planning-heading">
      <h2 id="nyc-category-planning-heading" className="text-xl font-bold text-dark mb-4">{guide.heading}</h2>
      <p className="text-gray-700 mb-6 leading-relaxed">{guide.intro}</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <Link href="/service-area" className="block bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 hover:shadow-md">
          <span className="block font-semibold text-dark mb-1">Check your delivery fee</span>
          Enter your event address with ZIP code for an estimate before you book.
        </Link>
        <Link href="/order-by-date" className="block bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 hover:shadow-md">
          <span className="block font-semibold text-dark mb-1">Check your event date</span>
          See rental availability and delivery arrangements for your event. Riverdale orders are delivery-only.
        </Link>
      </div>
      <h2 className="text-xl font-bold text-dark mb-4">{name} planning tips</h2>
      {guide.sections.map(section => (
        <div key={section.heading} className="mb-5">
          <h3 className="font-semibold text-dark mb-1">{section.heading}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{section.body}</p>
        </div>
      ))}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-dark mb-4">Explore your options</h2>
        <div className="flex flex-wrap gap-3">
          {guide.links.map(({ href, label }) => (
            <Link key={href} href={href} prefetch={false} className="bg-gray-100 rounded-full px-4 py-2 text-blue-700 text-sm font-medium hover:underline">{label}</Link>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-bold text-dark mb-4">{name} delivery areas</h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">Explore verified local rental guides for Riverdale, selected Bronx neighborhoods and Lower Westchester. Each guide covers delivery planning and local event considerations.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {verifiedAreas.map(area => (
            <Link key={area.slug} href={area.href} prefetch={false} className="font-semibold text-blue-800 underline">{name} in {area.name}, NY</Link>
          ))}
        </div>
      </div>
    </section>
  )
}
