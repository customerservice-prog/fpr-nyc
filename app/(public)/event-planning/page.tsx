import Link from 'next/link'
import Accordion from '@/components/public/Accordion'
import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ weight: ['600', '700'], subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Event Planning Services in Syracuse, NY',
  description: 'Full-service event planning from Friendly Party Rental. We plan and provide your rentals, so you do not need to hire a separate event planner. Serving Syracuse and Central New York.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/event-planning' },
}

const faqItems = [
  {
    question: 'Do I still need to hire a separate event planner?',
    answer: 'No. Our team plans, coordinates, and provides your rental equipment, so you get one point of contact instead of juggling a separate planner and rental company.',
  },
  {
    question: 'What happens if my event runs long?',
    answer: 'Each package includes a set number of on-site coordination hours. If your event runs beyond your package hours, additional time is billed at $85 per hour.',
  },
  {
    question: 'Can I add event planning to an existing rental order?',
    answer: 'Yes. Call us at 315-884-1498 or request a consultation below and we will help you add planning services to your rental order.',
  },
  {
    question: 'How many meetings and calls are included?',
    answer: 'Each package lists an exact number of planning meetings and check-in calls, so there are no surprises. Additional meetings or calls beyond your package can be added at $85 per hour.',
  },
  {
    question: 'What if my event does not fit one of these packages?',
    answer: 'Many of our best events are fully custom. Large festivals, multi-day events, and events with multiple activity areas happening at once are scoped and quoted individually so the plan actually matches your event. Contact us for a custom quote covering both rentals and coordination.',
  },
]

const packages = [
  {
    number: 1,
    name: 'Day-of Coordination',
    price: '$1,275',
    items: [
      'One 30-minute kickoff call',
      'One 60-minute planning meeting 30 days before your event',
      'Two 15-minute check-in calls',
      'Written day-of timeline',
      'Up to 1 hour of rehearsal guidance',
      'Up to 8 hours of on-site coordination on event day',
      'Email support with a 2-business-day response window',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 2,
    name: 'Signature Plus',
    price: '$1,500',
    items: [
      'Everything in Day-of Coordination',
      'Up to 3 hours of hands-on decor setup and styling the week of your event',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 3,
    name: 'Month-of Coordination',
    price: '$2,075',
    popular: true,
    items: [
      'One 30-minute kickoff call',
      'Four 45-minute planning meetings starting 8-12 weeks out',
      'Up to 4 email or text exchanges per week',
      'One 30-minute contract review call',
      'Up to 10 hours of on-site coordination on event day',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 4,
    name: 'Partial Planning',
    price: '$3,350',
    items: [
      'Everything in Month-of Coordination',
      'Weekly 30-minute check-in calls until key vendors are booked (capped at 8 calls)',
      'Biweekly 30-minute calls through your event after that',
      'Vendor outreach and negotiation capped at 5 vendor categories',
      'Additional time billed at $85 per hour',
    ],
  },
  {
    number: 5,
    name: 'Full-Service Planning',
    price: '$5,500',
    startingAt: true,
    items: [
      'Fully customized scope, confirmed in writing before booking',
      'Biweekly 45-minute planning meetings from booking through your event',
      'Full vendor sourcing and booking across all categories',
      'Budget tracking',
      'Up to 12 hours of on-site coordination on event day',
      'Additional time billed at $85 per hour',
    ],
  },
]

export default function EventPlanningPage() {
  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #0b2545 100%)' }}
      >
        <img src="https://files.sysers.com/cp/upload/315/gallery/full/ChatGPT-Image-Dec-14--2025--11_32_40-AM.png" alt="Elegant tent event setup with string lights" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20,20,20,0.92) 0%, rgba(15,42,74,0.90) 55%, rgba(11,37,69,0.88) 100%)' }} /><div className="absolute top-0 left-0 w-full h-1 z-10"
          style={{ background: 'linear-gradient(90deg, #D4AF37, #F4E5A1, #D4AF37)' }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold mb-4">Event Planning</p>
          <h1 className={`${playfair.className} text-4xl md:text-6xl font-bold text-white mb-5 drop-shadow-md`}>Full-Service Event Planning &mdash; All In-House</h1>
          <p className="text-white/90 max-w-2xl mx-auto mb-8 text-base md:text-lg">
            We plan it and we provide it, so you do not need to hire a separate event planner. One team, one contract, one point of contact from booking to breakdown.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="#packages" className="btn-primary inline-block px-8 uppercase text-sm tracking-wide">View Planning Packages</Link>
            <Link href="/contact_us" className="btn-gold inline-block px-8 uppercase text-sm tracking-wide">Get a Free Consultation</Link>
          </div>
        </div>
        <div className="relative z-10 border-t border-white/10 bg-black/20">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-white/80 text-xs md:text-sm uppercase tracking-wider">
            <span>One Team, One Contract</span>
            <span className="hidden md:inline w-px h-3 bg-[#D4AF37]/70"></span>
            <span>No Hidden Markups</span>
            <span className="hidden md:inline w-px h-3 bg-[#D4AF37]/70"></span>
            <span>Local Crew You Can Reach</span>
            <span className="hidden md:inline w-px h-3 bg-[#D4AF37]/70"></span>
            <span>Custom Quotes for Any Event</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-12"><div className="grid grid-cols-1 sm:grid-cols-3 gap-6"><img src="/images/event-planning/outdoor-tent-setup/image.png" alt="Real outdoor party tent setup by Friendly Party Rental" className="w-full h-56 object-cover rounded-xl shadow-lg ring-1 ring-[#D4AF37]/30 hover:shadow-xl transition-shadow duration-300" /><img src="/images/event-planning/tent-patio-setup/image.png" alt="Real tent and patio party setup with string lights by Friendly Party Rental" className="w-full h-56 object-cover rounded-xl shadow-lg ring-1 ring-[#D4AF37]/30 hover:shadow-xl transition-shadow duration-300" /><img src="/images/event-planning/ceremony-deck/image.png" alt="Real outdoor wedding ceremony setup with rows of white chairs on a deck" className="w-full h-56 object-cover rounded-xl shadow-lg ring-1 ring-[#D4AF37]/30 hover:shadow-xl transition-shadow duration-300" /></div><p className="text-center text-body text-sm mt-4">Real events we have planned and set up across Central New York</p></div><div className="max-w-7xl mx-auto px-4 py-16">
        <div id="packages" className="text-center mb-4">
          <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Clear, Upfront Pricing</p>
          <h2 className={`${playfair.className} text-3xl md:text-4xl font-bold text-dark mb-3`}>Event Planning Packages</h2>
          <p className="text-body max-w-2xl mx-auto">Every package lists an exact number of meetings, calls, and on-site hours, so there are no surprises. Additional time beyond your package can be added at $85 per hour. Have a larger or one-of-a-kind event? <Link href="#custom-quote" className="underline text-secondary font-semibold">See custom quotes below</Link>.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg) => (
            <div
              key={pkg.number}
              className={`relative bg-white rounded-xl shadow-lg border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-[#D4AF37]/50 ${pkg.popular ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/40' : 'border-gray-200'}`}
            >
              {pkg.popular && (
                <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md bg-gradient-to-r from-[#D4AF37] to-[#F4E5A1] text-[#1a1a1a]">&#9733; Most Popular</div>
              )}
              <div className="p-6">
                <p className="text-xs text-[#B8860B] font-bold uppercase tracking-[0.2em] mb-2">Package {pkg.number}</p>
                <h3 className={`${playfair.className} text-2xl font-bold text-dark mb-1`}>{pkg.name}</h3>
                <p className="text-3xl font-bold text-secondary mb-1">{pkg.price}{pkg.startingAt ? ' starting' : ''}</p>
                <div className="h-px bg-gradient-to-r from-[#D4AF37]/60 via-[#D4AF37]/20 to-transparent mb-4 mt-3" />
                <ul className="space-y-2 mb-2">
                  {pkg.items.map((item) => (
                    <li key={item} className="text-sm text-body flex items-start gap-2">
                      <span className="text-[#B8860B] mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-body text-sm max-w-2xl mx-auto mb-16">
          Each package includes a set number of meetings, calls, and on-site hours as listed above. Additional time beyond your package can be added at $85 per hour.
        </p>

        <div id="custom-quote" className="max-w-3xl mx-auto mb-16 rounded-xl p-8 text-center shadow-md border border-[#D4AF37]/40" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #0b2545 100%)' }}>
          <p className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold mb-3">No Event Too Big or Too Unusual</p>
          <h3 className={`${playfair.className} text-2xl font-bold text-white mb-3`}>Don&apos;t See Your Event Above? We&apos;ll Build You a Custom Quote.</h3>
          <p className="text-white/90 mb-4">
            Festivals, multi-day events, corporate activations, fundraisers, and events with several activity areas running at once do not always fit neatly into a set package. We are happy to build a custom quote for your rentals and event coordination together, scoped around what your event actually needs.
          </p>
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-wide mb-6">Festivals &middot; Multi-Day Events &middot; Corporate Activations &middot; Fundraisers &middot; Anything Non-Standard</p>
          <Link href="/contact_us" className="btn-gold inline-block px-8 uppercase text-sm tracking-wide">Get My Custom Quote</Link>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-8">
            <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Meet The Team</p>
            <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-dark mb-2`}>Your Event Planning Team</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-center"><img src="https://files.sysers.com/cp/upload/315/gallery/full/1a8d3742f73b4ed1844000d04f6cd0ae-760x428-nopad-40X100-WEDDING-TENT.jpg" alt="Real event setup by the Friendly Party Rental team" className="w-full h-64 object-cover rounded-xl shadow-md" /><div className="bg-white border border-[#D4AF37]/30 rounded-xl p-8 shadow-md text-center md:text-left">
            <p className="text-body mb-4">
              Your event is planned and coordinated by Nicole, dedicated full-time to guiding you from your first call through final breakdown. She works hand-in-hand with the same crew who delivers, sets up, and manages your rentals on event day, so you get one connected team instead of a planner and a rental company working separately.
            </p>
            <div className="relative pl-8 mt-2"><span className="absolute left-0 -top-2 text-5xl text-[#D4AF37]/50 leading-none select-none">&ldquo;</span><p className={`${playfair.className} italic text-lg text-dark`}>Nicole was an excellent communicator and helped us with a smooth pick up and drop off.</p><p className="text-sm text-[#B8860B] font-bold uppercase tracking-wide mt-2">&mdash; Angela R.</p></div></div></div>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>Event Planning FAQ</h2>
          <Accordion items={faqItems} />
        </div>

        <div
          className="relative overflow-hidden rounded-2xl text-center py-14 px-6"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #0b2545 100%)' }}
        >
          <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-white mb-6`}>Ready to Plan Your Event?</h2>
          <Link href="/contact_us" className="btn-gold inline-block px-10 uppercase text-sm tracking-wide">Get a Free Consultation</Link>
        </div>
      </div>
    </div>
  )
}
