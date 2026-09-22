import { planningPackages } from '@/lib/eventPlanning'
export default function PlanningPackages() {
  return <section id="packages" className="scroll-mt-28 py-12">
    <details className="rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
      <summary className="cursor-pointer text-xl font-bold text-slate-950 md:text-2xl">Compare every package, meeting & included hour</summary>
      <div className="mb-7 mt-5 max-w-2xl"><h2 className="text-xl font-bold text-slate-950">Planning packages & pricing</h2><p className="mt-3 text-sm leading-7 text-slate-600">The complete published scope behind your estimate. Rental equipment and event logistics must be confirmed in your written quote. Custom events are quoted individually.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{planningPackages.map(pkg => <article key={pkg.number} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-lg font-bold text-slate-950">{pkg.name}</h3><p className="mt-3 text-2xl font-bold text-blue-900">{pkg.price}<span className="ml-2 text-xs font-normal text-slate-500">{pkg.startingAt ? 'starting price' : 'planning service'}</span></p><ul className="my-5 space-y-3 text-xs leading-relaxed text-slate-600">{pkg.items.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-blue-700">✓</span><span>{item}</span></li>)}</ul><a href="#event-estimator" className="mt-auto rounded-xl border border-blue-200 bg-white px-4 py-3 text-center text-xs font-bold text-blue-900 hover:bg-blue-50">Compare in the visual estimator</a></article>)}</div>
      <p className="mt-5 text-xs leading-7 text-slate-600">Additional planning time: $85 per hour. Availability, rental items, delivery, setup, pickup, travel fees and applicable taxes are confirmed in your quote and agreement.</p>
    </details>
  </section>
}
