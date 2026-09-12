import Accordion from '@/components/public/Accordion'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/jsonLd'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to common questions about booking, delivery, setup, equipment safety, and rental policies for party rentals in Greenville, SC and Upstate South Carolina.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/frequently_asked_questions' },
}

const faqSections = [
  {
    title: 'BOOKING & PAYMENTS',
    items: [
      { question: 'How do I book a rental?', answer: 'Browse our catalog, select items, choose your event date, and complete checkout. You can also call 315-884-1498 for help.' },
      { question: 'Do I need to pay a deposit?', answer: 'Yes. A deposit is required at booking. The balance is due before delivery.' },
      { question: 'What payment methods do you accept?', answer: 'We accept all major credit and debit cards through our secure checkout.' },
      { question: 'When is the remaining balance due?', answer: 'The balance is due before delivery. Automatic reminders are sent.' },
      { question: 'What if I need to cancel or reschedule?', answer: 'Deposits are non-refundable but rainchecks are valid for one year.' },
      { question: 'How far in advance should I book?', answer: 'As early as possible. Summer weekends book 4-8 weeks out.' },
      { question: 'Can I modify my order after booking?', answer: 'Yes, with 48-72 hours notice.' },
    ],
  },
  {
    title: 'DELIVERY, SETUP & PICKUP',
    items: [
      { question: 'Does the price include delivery and setup?', answer: 'Tent delivery and setup is included for most Greenville County locations. Table and chair setup is available for an additional fee.' },
      { question: 'What areas do you serve?', answer: 'Greenville, Greer, Simpsonville, Mauldin, Taylors, Easley, Travelers Rest, Fountain Inn, Piedmont, and surrounding Upstate South Carolina.' },
      { question: 'When do you set up?', answer: 'Setup is coordinated in advance based on your event schedule.' },
      { question: 'Does setup time count toward my rental period?', answer: 'No.' },
      { question: 'What if my event starts early in the morning?', answer: 'Early setups are available.' },
      { question: 'When do you pick up?', answer: 'Same day or following morning for evening events.' },
    ],
  },
  {
    title: 'EQUIPMENT, SAFETY & CLEANLINESS',
    items: [
      { question: 'Are your tents and equipment cleaned?', answer: 'Yes — every piece is cleaned, sanitized, and inspected before every rental.' },
      { question: 'How often is equipment inspected?', answer: 'Before and after each event.' },
      { question: 'What if something breaks?', answer: 'Normal wear is covered. Damage from misuse may have costs.' },
      { question: 'Is equipment safe for children?', answer: 'Yes. Commercial-grade equipment. Adult supervision is recommended.' },
      { question: 'Do you carry insurance?', answer: 'Yes, we are fully insured.' },
    ],
  },
  {
    title: 'BOUNCE HOUSES, INFLATABLES & POWER',
    items: [
      { question: 'How much does a bounce house cost?', answer: 'Starting at $199. Waterslides $250-$499. Combo from $500.' },
      { question: 'Do bounce houses need to stay plugged in?', answer: 'Yes, constant air supply is needed. 20-amp outlet within 100 feet.' },
      { question: 'What size are bounce houses?', answer: '~13x13 to 15x15 ft. Exact dimensions on each product page.' },
      { question: 'Do water slides need a water hookup?', answer: 'Yes, standard garden hose.' },
      { question: 'Can bounce houses be set up indoors?', answer: 'Yes, minimum 14-16 ft ceiling height.' },
      { question: 'How many children at once?', answer: '6-8 children based on age and weight guidelines.' },
      { question: 'What happens if it rains?', answer: 'Light rain is OK. Heavy rain, lightning, or high winds require shutdown.' },
    ],
  },
  {
    title: 'PARKS, SURFACES, PERMITS',
    items: [
      { question: 'Can you set up at parks?', answer: 'Yes. Permits may be required — customer is responsible.' },
      { question: 'Do parks have electricity for bounce houses?', answer: 'Many do not. Generator rental from $125.' },
      { question: 'What surfaces can you set up on?', answer: 'Grass, pavement, turf, gravel, concrete.' },
      { question: 'Do I need a permit for a backyard tent?', answer: 'Usually no for residential. Large tents at commercial venues may need permits.' },
      { question: 'Can you do a free yard assessment?', answer: 'Yes. Call 315-884-1498.' },
      { question: 'Do you serve all of Upstate SC?', answer: 'Yes, Greenville County and surrounding areas.' },
    ],
  },
]
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqSections.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))
  ),
}


export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <h1 className="text-3xl font-bold text-dark mb-2 text-center">Frequently Asked Questions</h1>
      <p className="text-body text-center mb-10">
        Get answers to the most common questions about party rental in Greenville, SC
      </p>

      <div className="space-y-10">
        {faqSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-bold text-dark mb-4 border-b border-primary pb-2">
              {section.title}
            </h2>
            <Accordion items={section.items} />
          </div>
        ))}
      </div>
    </div>
  )
}
