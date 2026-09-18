import type { Metadata } from 'next'
import Link from 'next/link'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'

export const metadata: Metadata = {
  title: 'Design Your Event Online | Friendly Party Rental Greenville SC',
  description: 'Plan your Greenville event layout in 2D and 3D with tents, tables, chairs and event rental equipment before you book.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/design-your-event' },
}

const steps = [
  ['01', 'Start with your event', 'Choose the event you are planning and work from your guest count.'],
  ['02', 'Build the layout', 'Arrange tents, tables, chairs and other event equipment around your space.'],
  ['03', 'Preview the setup', 'Use the designer to understand spacing and guest flow before event day.'],
  ['04', 'Send us your design', 'Share the layout with Friendly Party Rental so we can confirm equipment and availability.'],
]

export default function DesignYourEventPage() {
  return <main className="overflow-hidden bg-white text-[#0B1F3A]">
    <section className="relative bg-[#07182d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(224,123,0,.18),transparent_36%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
        <p className="mx-auto mb-5 w-fit rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#F4C542]">Friendly Event Designer</p>
        <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">Build Your Event. See the Layout Before Setup Day.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">Plan your tent, tables, chairs and event layout visually with Friendly Party Rental equipment for events throughout Greenville and the Upstate.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <DesignYourEventCTA source="design_your_event_page" label="Start Designing My Event" variant="primary" />
          <Link href="/category" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-[#0B1F3A]">Browse Rentals</Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-white/65"><span>✓ No download</span><span>✓ No commitment</span><span>✓ Works on phone, tablet & desktop</span></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">Simple planning</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">From an idea to a layout you can actually use</h2><p className="mt-3 leading-7 text-gray-600">Experiment with your setup before reserving equipment, then send the plan to our team for final confirmation.</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([n,title,body])=><article key={n} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_8px_30px_rgba(11,31,58,.06)]"><span className="text-sm font-black text-[#E07B00]">{n}</span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{body}</p></article>)}</div>
    </section>

    <section className="bg-[#F5F6F7] py-14 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">Plan before delivery day</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Make sure the pieces work together.</h2><p className="mt-4 leading-7 text-gray-600">Use the designer to think through tent placement, seating, tables and event flow. It gives you and our team a clearer picture of the setup you are trying to create.</p></div>
        <div className="rounded-[2rem] bg-[#0B1F3A] p-7 text-white shadow-xl"><h3 className="text-2xl font-black">Ready to try your layout?</h3><p className="mt-3 leading-7 text-white/70">Open the designer, build your event, and share the result with Friendly Party Rental.</p><div className="mt-6"><DesignYourEventCTA source="design_your_event_midpage" label="Open the Event Designer" variant="primary" /></div></div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8"><h2 className="text-3xl font-black sm:text-4xl">Design it. Then let us help make it happen.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">Your design is a planning tool, not a reservation. Final availability, site requirements, delivery details and pricing are confirmed by Friendly Party Rental.</p><div className="mt-7"><DesignYourEventCTA source="design_your_event_footer" label="Start Designing" variant="primary" /></div></section>
  </main>
}
