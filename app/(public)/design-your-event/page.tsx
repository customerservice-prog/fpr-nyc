import { nycPageMetadata } from '@/lib/nycSeo'
import StorefrontDesigner from '@/components/public/StorefrontDesigner'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'


export const metadata = nycPageMetadata("/design-your-event","2D & 3D Event Designer in Riverdale, Bronx, NY","Build a real 2D and 3D event layout with Friendly Party Rental NYC equipment, preview tents and inflatables, and open included design access for qualifying NYC orders.")

const features = [
  ['01', 'Start with your event', 'Tell our NYC / Downstate team your guest count and what you are planning.'],
  ['02', 'Build the layout', 'Arrange tents, tables, chairs, dance floors and other event equipment.'],
  ['03', 'See it in 3D', 'Switch from floor-plan view to a visual preview of the event you created.'],
  ['04', 'Send us your design', 'Request a quote from the layout or continue to the Friendly Party Rental NYC catalog to confirm date availability and final pricing.'],
]

const equipment = [
  ['Tents', 'Pole and frame tents', 'Build around the size and style of tent your event needs.'],
  ['Tables & Chairs', 'Seating layouts', 'Test table placement, seating capacity and guest flow before setup day.'],
  ['Dance Floors', 'Reception layouts', 'Place a dance floor and see how much usable space remains around it.'],
  ['Event Extras', 'Complete the setup', 'Add equipment and details around the main event layout.'],
]

export default function DesignYourEventPage() {
  return <main className="overflow-hidden bg-white text-[#0B1F3A]">
    <section className="relative bg-[#07182d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(224,123,0,.18),transparent_36%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[.9fr_1.1fr] md:py-20 lg:gap-16 lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#F4C542]">RentSketch Event Designer</div>
          <h1 className={`font-serif max-w-xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl`}>Build Your Event. See It Before Setup Day.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">See how a 2D floor plan becomes a 3D event layout using the dedicated Friendly Party Rental NYC RentSketch workspace. Start from a rental, build the room or yard around it, and use your saved layout as the planning reference for the quote.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#quick-demo" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E07B00] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c96d00]">Watch the Quick Demo</a>
            <Link href="/contact_us" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-[#0B1F3A]">Get Riverdale Layout Help</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/65"><span>✓ Quick walkthrough</span><span>✓ No account needed</span><span>✓ Phone, tablet & desktop</span></div>
        </div>
        <div className="relative">
          <div className="absolute -inset-5 rounded-[2.25rem] bg-[#E07B00]/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/5 p-2 shadow-2xl">
            <Image src="/images/design-your-event-3d-preview.png" alt="RentSketch 3D event layout preview with tent, tables and chairs" width={1200} height={675} priority className="w-full rounded-[1.35rem] object-cover" />
            <div className="absolute bottom-5 left-5 rounded-full bg-[#07182d]/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">3D Event Preview</div>
          </div>
        </div>
      </div>
    </section>

    <div id="quick-demo" className="scroll-mt-24"><StorefrontDesigner /></div>
    <section className="border-b border-gray-100 bg-[#FAFAF8]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-gray-200 px-4 py-5 text-center md:grid-cols-4">
        {['Use real rental equipment','Plan around your guest count','Switch between 2D + 3D','Send your layout to our team'].map((item)=><div key={item} className="px-3 py-2 text-xs font-extrabold sm:text-sm">{item}</div>)}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">Simple planning</p><h2 className={`font-serif mt-2 text-3xl font-bold sm:text-4xl`}>From an idea to a layout you can actually see</h2></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(([n,title,body])=><article key={n} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_8px_30px_rgba(11,31,58,.06)]"><span className="text-sm font-black text-[#E07B00]">{n}</span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{body}</p></article>)}</div>
    </section>

    <section className="bg-[#F5F6F7] py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"><div className="px-4 py-3 text-sm font-black">2D Floor Plan</div><Image src="/images/design-your-event-2d-preview.png" alt="RentSketch 2D event floor plan" width={1200} height={675} className="w-full" /></div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg sm:mt-10"><div className="px-4 py-3 text-sm font-black">3D Preview</div><Image src="/images/design-your-event-3d-preview.png" alt="RentSketch 3D event preview" width={1200} height={675} className="w-full" /></div>
          </div>
          <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">See the difference</p><h2 className={`font-serif mt-2 text-3xl font-bold sm:text-4xl`}>Plan the space, then step inside the idea.</h2><p className="mt-4 max-w-xl leading-7 text-gray-600">Use the floor plan to work out placement and spacing. Then switch to 3D to see how the tent, tables, chairs and event area work together.</p><div className="mt-7 flex flex-wrap gap-3"><a href="#quick-demo" className="btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-semibold">Watch the Quick Demo</a><Link href="/contact_us" className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#0B1F3A] px-6 py-3 font-semibold text-[#0B1F3A]">Ask About My Layout</Link></div></div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mb-9 max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">Build with our equipment</p><h2 className={`font-serif mt-2 text-3xl font-bold sm:text-4xl`}>Design more than a tent</h2><p className="mt-3 leading-7 text-gray-600">Work through the pieces that determine whether an event layout actually fits and feels comfortable.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{equipment.map(([title,kicker,body])=><div key={title} className="group rounded-2xl border border-gray-200 p-6 transition hover:-translate-y-1 hover:shadow-lg"><p className="text-xs font-bold uppercase tracking-wider text-[#D66E00]">{kicker}</p><h3 className="mt-3 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{body}</p></div>)}</div>
    </section>

    <section className="bg-[#FAFAF8] py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-white p-7"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#D66E00]">Start from the exact rental</p><h2 className="mt-2 text-2xl font-bold">Preview tents and inflatables from their item pages</h2><p className="mt-3 text-sm leading-7 text-gray-600">Open a tent or inflatable listing and launch RentSketch with that rental already selected. Continue the same scene with seating, dance-floor space and event extras instead of starting over.</p></article>
          <article className="rounded-2xl border border-gray-200 bg-white p-7"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#D66E00]">Already booked?</p><h2 className="mt-2 text-2xl font-bold">Qualifying NYC orders include design access</h2><p className="mt-3 text-sm leading-7 text-gray-600">Use the Existing Order Login with the first name on the booking and the order number. Paid or staff-approved active bookings can reopen the same saved event through seven days after the event date.</p></article>
          <article className="rounded-2xl border border-gray-200 bg-white p-7"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#D66E00]">Price safely</p><h2 className="mt-2 text-2xl font-bold">The layout does not replace checkout pricing</h2><p className="mt-3 text-sm leading-7 text-gray-600">Use RentSketch for fit and planning. Use Friendly Party Rental NYC checkout for the live rental subtotal, duration pricing, delivery fee, jurisdiction tax, deposit and event-date availability.</p></article>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D66E00]">Before you finalize the layout</p><h2 className={`font-serif mt-2 text-3xl font-bold`}>Measure the usable space, not just the property line.</h2><p className="mt-4 leading-7 text-gray-600">Note fences, gates, stairs, slopes, trees, overhead lines, utilities, driveways and the actual setup surface. Leave circulation room around buffet tables, dance floors and tent exits. A visual layout helps the conversation, but installation requirements are confirmed by the delivery/setup team.</p></div>
        <div className="rounded-2xl bg-[#0B1F3A] p-7 text-white"><h2 className="text-2xl font-bold">What the NYC planner can help answer</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-white/80"><li>✓ Will the table count leave comfortable walkways?</li><li>✓ Does a dance floor change the tent size I need?</li><li>✓ Where can concessions, games or an inflatable fit?</li><li>✓ How does the layout change between 2D planning and 3D preview?</li><li>✓ Which rentals should I add before requesting the final quote?</li></ul></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 md:pb-20 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-6 py-10 text-white md:px-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
        <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#F4C542]">When your layout is ready</p><h2 className={`font-serif mt-2 text-3xl font-bold`}>Send it to Friendly Party Rental.</h2><p className="mt-3 max-w-2xl leading-7 text-white/70">Your layout ideas help our NYC / Downstate team understand the setup you are trying to create. We will confirm equipment, availability, site details and final pricing before the order is finalized.</p></div>
        <div className="mt-7 flex flex-col gap-3 lg:mt-0"><a href="#quick-demo" className="btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-semibold">Watch the Quick Demo</a><Link href="/contact_us" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white">Get Layout Help</Link></div>
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-gray-500">The Event Designer is a planning and visualization tool. RentSketch uses the synced NYC rental catalog and prices as a planning reference, not a reservation. NYC checkout remains the authority for event-date availability, duration pricing, delivery, tax and deposit; final site requirements are confirmed by Friendly Party Rental NYC.</p>
    </section>
  </main>
}
