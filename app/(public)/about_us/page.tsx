import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Friendly Party Rental, a family-owned party rental company based in Greenville, SC serving Greenville and Upstate South Carolina for over 10 years with clean, reliable rental equipment.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/about_us' },
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-dark mb-3">About Friendly Party Rental</h1>
        <p className="text-body text-lg">Local. Reliable. Clean, event-ready rentals for Greenville & Upstate South Carolina.</p>
      </div>

      <div className="space-y-6 text-body mb-12">
        <p>
          Friendly Party Rental is a family-owned party rental company based in Greenville, SC, proudly serving Greenville and Upstate South Carolina communities. For over 10 years, we have been helping families, schools, businesses, and organizations create memorable events with reliable rental equipment and friendly local service.
        </p>
        <p>
          Our inventory includes tents, tables, chairs, linens, dance floors, generators, event lighting, popcorn machines, cotton candy machines, and much more. Every piece of equipment is professionally cleaned, inspected, and prepared before every rental so your event looks great and runs smoothly.
        </p>
        <p>
          We believe event planning should be simple and stress-free. That is why we offer easy online booking, transparent pricing, dependable delivery and pickup, and a team that genuinely cares about making your event a success. If you would rather not coordinate everything yourself, ask about our <Link href="/event-planning" className="text-secondary underline font-semibold">full-service event planning</Link>, so you do not need to hire a separate event planner.
        </p>
        <p>
          Whether you are planning a wedding, graduation party, corporate event, birthday celebration, or backyard gathering, Friendly Party Rental has the equipment and expertise to help you pull it off without the hassle.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { title: 'Clean Equipment', desc: 'Every item is professionally cleaned and inspected before every rental.' },
          { title: 'Reliable Service', desc: 'On-time delivery and pickup so you can focus on your event.' },
          { title: 'Easy Booking', desc: 'Book online in minutes with our simple date-based ordering system.' },
        ].map((card) => (
          <div key={card.title} className="bg-primary/10 p-6 rounded-lg text-center border border-primary/30">
            <h3 className="font-bold text-dark mb-2">{card.title}</h3>
            <p className="text-body text-sm">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link href="/order-by-date" prefetch={false} className="btn-primary inline-block">Book by Date</Link>
      </div>
    </div>
  )
}
