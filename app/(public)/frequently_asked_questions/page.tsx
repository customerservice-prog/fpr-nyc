import Link from 'next/link'
import { nycPageMetadata } from '@/lib/nycSeo'
import Accordion from '@/components/public/Accordion'
import { safeJsonLd } from '@/lib/jsonLd'
import { BUSINESS } from '@/lib/utils'
import { NYC_FAQ_SECTIONS } from '@/lib/nycCustomerHelp'

export const metadata = nycPageMetadata('/frequently_asked_questions', 'Party Rental Questions — Riverdale, Bronx, NY', 'Find answers about NYC event inquiries, quotes, delivery, setup and venue preparation. Contact Friendly Party Rental NYC for help with your event.')

export default function FAQPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: NYC_FAQ_SECTIONS.flatMap(section => section.items.map(item => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    }))),
  }
  return (
    <div data-nyc-customer-help="faq" className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      <h1 className="mb-3 text-center text-3xl font-bold text-dark">Frequently Asked Questions</h1>
      <p className="mx-auto mb-6 max-w-2xl text-center leading-7 text-body">Planning an event in Riverdale, the Bronx or Lower Westchester? Start here, then confirm the details for your exact date, location and equipment with our NYC team.</p>
      <nav aria-label="FAQ topics" className="mb-8 flex flex-wrap justify-center gap-2">
        {NYC_FAQ_SECTIONS.map(section => <a key={section.id} href={`#faq-${section.id}`} className="rounded-full border px-4 py-2 text-sm font-semibold text-dark hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">{section.title}</a>)}
      </nav>
      <p className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-dark">Your confirmed NYC quote and rental agreement control pricing, payment deadlines and cancellation terms. This page does not promise an available item, a delivery time or a free service.</p>
      <div className="space-y-10">
        {NYC_FAQ_SECTIONS.map(section => (
          <section key={section.id} id={`faq-${section.id}`} aria-labelledby={`faq-heading-${section.id}`} className="scroll-mt-28">
            <h2 id={`faq-heading-${section.id}`} className="mb-4 border-b border-primary pb-2 text-xl font-bold text-dark">{section.title}</h2>
            <Accordion items={section.items} />
          </section>
        ))}
      </div>
      <section aria-labelledby="faq-contact" className="mt-10 rounded-xl border bg-gray-50 p-6">
        <h2 id="faq-contact" className="text-xl font-bold text-dark">Need help with your event?</h2>
        <p className="mt-2 text-sm leading-6 text-body">Have your event date, exact address and requested items ready. For an existing NYC order, include your order number.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`tel:${BUSINESS.phone}`} className="btn-primary inline-flex min-h-12 items-center justify-center px-5">Call {BUSINESS.phone}</a>
          <Link href="/contact_us" className="inline-flex min-h-12 items-center justify-center rounded border px-5 font-semibold text-dark">Contact the NYC team</Link>
          <Link href="/service-area" className="inline-flex min-h-12 items-center justify-center px-2 font-semibold text-secondary underline">View delivery areas</Link>
        </div>
      </section>
    </div>
  )
}
