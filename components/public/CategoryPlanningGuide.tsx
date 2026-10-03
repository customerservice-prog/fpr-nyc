import Link from 'next/link'
import { getCategoryPlanningContent } from '@/lib/categoryPlanningContent'
import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'
import { NYC_LOCAL_PLANNING } from '@/lib/nycLocalPlanningResources'

export default function CategoryPlanningGuide({ slug, name }: { slug: string; name: string }) {
  const guide = getCategoryPlanningContent(slug, name)
  const verifiedAreas=NYC_SERVICE_AREAS.filter(area=>Boolean(NYC_LOCAL_PLANNING[area.slug]))
  return <section className="mx-auto max-w-4xl px-4 pb-12" aria-labelledby="nyc-category-planning-heading">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-secondary">Riverdale, Bronx & Lower Westchester rental planning guide</p>
      <h2 id="nyc-category-planning-heading" className="text-2xl font-bold text-dark">{guide.heading}</h2>
      <p className="mt-4 leading-7 text-body">{guide.intro}</p>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {guide.sections.map(section => <div key={section.heading} className="rounded-xl bg-gray-50 p-5">
          <h3 className="font-bold text-dark">{section.heading}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">{section.body}</p>
        </div>)}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-bold text-dark">Helpful next steps</h3>
        <div className="flex flex-wrap gap-3">
          {guide.links.map(link => <Link key={link.href} href={link.href} prefetch={false} className="rounded-full bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16365f]">
            {link.label}
          </Link>)}
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="mb-2 font-bold text-dark">{name} delivery areas</h3>
        <p className="mb-4 text-sm leading-6 text-gray-600">Explore verified local rental guides for Riverdale, selected Bronx neighborhoods and Lower Westchester. Each guide covers delivery planning and local event considerations.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {verifiedAreas.map(area => <Link key={area.slug} href={area.href} prefetch={false} className="font-semibold text-blue-800 underline">
            {name} in {area.name}, NY
          </Link>)}
        </div>
      </div>
    </div>
  </section>
}
