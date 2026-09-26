import Link from 'next/link'
import { getCategoryPlanningContent } from '@/lib/categoryPlanningContent'

export default function CategoryPlanningGuide({ slug, name }: { slug: string; name: string }) {
  const guide = getCategoryPlanningContent(slug, name)
  return <section className="mx-auto max-w-4xl px-4 pb-12" aria-labelledby="sc-category-planning-heading">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-secondary">Greenville rental planning guide</p>
      <h2 id="sc-category-planning-heading" className="text-2xl font-bold text-dark">{guide.heading}</h2>
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
    </div>
  </section>
}
