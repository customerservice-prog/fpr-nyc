import { createElement, Suspense, Fragment } from 'react'
import LocalDeliveryLinks from '@/components/public/LocalDeliveryLinks'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PUBLIC_ITEM_SELECT } from '@/lib/availability'
import CategoryClient from './CategoryClient'
import { safeJsonLd } from '@/lib/jsonLd'
import { categoryDescriptionForSc, itemDescriptionForSc } from '@/lib/scPublicCopy'

export default async function CategorySlugPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const slug = params.slug

  const results = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    prisma.item.findMany({
      where: { displayToCustomer: true, category: { slug } },
      select: PUBLIC_ITEM_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ])
  const category = results[0]
  const items = results[1]
  if (!category || !category.displayToCustomer) notFound()

  const initialCategory = {
    name: category.name,
    description: categoryDescriptionForSc(category.name, category.description),
    bookableAfter: category.bookableAfter ? category.bookableAfter.toISOString() : null,
    bookableAfterMessage: category.bookableAfterMessage == null ? null : category.bookableAfterMessage,
  }

  const initialItems = items.map((item) => ({
    ...item,
    description: itemDescriptionForSc(item.name, item.description),
    available: item.quantity,
    bookableAfter: item.bookableAfter ? item.bookableAfter.toISOString() : null,
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
  }))

  const priceValues = items
    .filter((item) => item.type === 'Regular')
    .map((item) => Number(item.cost))
    .filter((n) => Number.isFinite(n))
  const minPrice = priceValues.length ? Math.min(...priceValues) : null
  const categoryLabel = category.name
  const categoryLower = category.name.toLowerCase()

  const whyChooseUs = [
    'Family-owned with more than 10 years of event-rental experience',
    'Fully insured with professional delivery and setup crews',
    'Clean, professionally maintained equipment',
    'Greenville-area delivery and event-site collection; no warehouse customer pickup',
  ]

  const faqs = [
    {
      q: 'How much does it cost to rent ' + categoryLower + ' in Greenville, SC?',
      a: minPrice
        ? 'Pricing starts at $' + minPrice.toFixed(2) + '/day and depends on the specific item, quantity, rental duration, delivery location, and setup requirements. Call 864-610-5324 for help with a quote.'
        : 'Pricing depends on the specific item, quantity, rental duration, delivery location, and setup requirements. Call 864-610-5324 for help with a quote.',
    },
    {
      q: 'Do you deliver ' + categoryLower + ' near me?',
      a: 'Yes. We serve Greenville, Taylors, Greer, Simpsonville, Mauldin, Travelers Rest, Fountain Inn, and surrounding Upstate South Carolina communities. Travel fees depend on distance.',
    },
    {
      q: 'How far in advance should I book ' + categoryLower + '?',
      a: 'Book as early as possible for popular spring, summer, and fall weekends. Checking your date online will show the current availability for the items you are considering.',
    },
    {
      q: 'Can your team help me choose the right rentals?',
      a: 'Yes. Call 864-610-5324 for help choosing equipment or planning a tent, table and chair layout with our Greenville team.',
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  const introText = categoryDescriptionForSc(
    categoryLabel,
    category.description || `${categoryLabel} from Friendly Party Rental serve Greenville, SC and surrounding Upstate South Carolina communities. Browse the current inventory below, check your event date, and contact our team if you need help choosing the right setup.`
  )

  const introEl = createElement('p', { className: 'text-gray-700 mb-10 leading-relaxed' }, introText)
  const whyChooseUsEl = createElement(
    'div',
    { className: 'grid sm:grid-cols-2 gap-4 mb-10' },
    ...whyChooseUs.map((w, i) => createElement(
      'div',
      { key: i, className: 'flex items-start gap-2 bg-gray-50 border rounded-lg p-4 text-sm text-gray-700' },
      createElement('span', { className: 'text-primary mt-0.5' }, String.fromCharCode(10003)),
      createElement('span', null, w)
    ))
  )

  const faqEl = createElement(
    'div',
    null,
    createElement('h2', { className: 'text-xl font-bold text-dark mb-4' }, categoryLabel + ' FAQ'),
    ...faqs.map((f, i) => createElement(
      'div',
      { key: i, className: 'mb-4' },
      createElement('h3', { className: 'font-semibold text-dark mb-1' }, f.q),
      createElement('p', { className: 'text-sm text-gray-700' }, f.a)
    ))
  )

  const relatedCategories = [
    { name: 'Tent Rentals', href: '/category/tent-rentals' },
    { name: 'Table and Chair Rentals', href: '/category/table-chair-rentals' },
    { name: 'Wedding Rentals', href: '/weddings' },
    { name: 'Dance Floor Rentals', href: '/category/dance-floor-stage-rentals' },
    { name: 'Linens', href: '/category/linen-rentals' },
    { name: 'Event Lighting', href: '/category/event-lighting-rentals' },
  ].filter((c) => !c.href.endsWith('/' + slug))

  const relatedEl = createElement(
    'div',
    { className: 'mt-10' },
    createElement('h2', { className: 'text-xl font-bold text-dark mb-4' }, 'Popular Categories'),
    createElement(
      'div',
      { className: 'flex flex-wrap gap-3' },
      ...relatedCategories.map((c, i) => createElement('a', { key: i, href: c.href, className: 'bg-gray-100 rounded-full px-4 py-2 text-blue-700 text-sm font-medium' }, c.name))
    )
  )

  const faqSchemaEl = createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: safeJsonLd(faqJsonLd) },
  })

  const seoSection = createElement(
    'section',
    { className: 'max-w-4xl mx-auto px-4 pb-16' },
    introEl,
    whyChooseUsEl,
    faqEl,
    faqSchemaEl,
    relatedEl,
    createElement(LocalDeliveryLinks)
  )

  return createElement(
    Fragment,
    null,
    createElement(
      Suspense,
      { fallback: createElement('p', { className: 'text-center py-12' }, 'Loading...') },
      createElement(CategoryClient, {
        slug,
        initialCategory,
        initialItems,
      })
    ),
    seoSection
  )
}
