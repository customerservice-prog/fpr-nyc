import { createElement, Suspense, Fragment } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PUBLIC_ITEM_SELECT } from '@/lib/availability'
import CategoryClient from './CategoryClient'
import { safeJsonLd } from '@/lib/jsonLd'

// Server Component: fetches category + items on the server so Google (and any
// non-JavaScript client) receives real inventory in the initial HTML response,
// instead of an empty "Loading..." / "No items found" shell that only fills in
// after a client-side fetch. Interactive booking/date/cart behavior still lives
// in CategoryClient and re-fetches as needed once the user picks a date.
// (Uses createElement instead of JSX purely to keep this file tiny and avoid
// editor auto-tag-closing issues; behavior is identical to JSX.)
export default async function CategorySlugPage(props: { params: Promise<{ slug: string }> }) {
        const params = await props.params
        const slug = params.slug

    const results = await Promise.all([
                prisma.category.findUnique({ where: { slug: slug } }),
                prisma.item.findMany({
                                where: { displayToCustomer: true, category: { slug: slug } },
                                select: PUBLIC_ITEM_SELECT,
                                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                }),
            ])
        const category = results[0]
        const items = results[1]
        if (!category) {
                    notFound()
        }

    const initialCategory = category
            ? {
                            name: category.name,
                            description: category.description == null ? undefined : category.description,
                            bookableAfter: category.bookableAfter ? category.bookableAfter.toISOString() : null,
                            bookableAfterMessage: category.bookableAfterMessage == null ? null : category.bookableAfterMessage,
            }
                : null

    const initialItems = items.map(function (item) {
                return Object.assign({}, item, {
                                available: item.quantity,
                                bookableAfter: item.bookableAfter ? item.bookableAfter.toISOString() : null,
                                updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
                })
    })

    // Additive SEO content block: a short unique intro, a trust/why-choose-us
    // block, and a small FAQ built from this category's real name and real
    // item pricing. Purely additive -- does not change booking/cart behavior,
    // which still lives entirely in CategoryClient above.
    const priceValues = items
            .map(function (item) { return Number(item.cost) })
            .filter(function (n) { return Number.isFinite(n) })
        const minPrice = priceValues.length ? Math.min.apply(null, priceValues) : null

    const categoryLabel = category.name
        const categoryLower = category.name.toLowerCase()

    const whyChooseUs = [
                'Family-owned and operated for 10+ years',
                'Fully insured with background-checked delivery crews',
                'Clean, professionally maintained equipment',
                'Delivery, setup, and pickup included with every rental',
            ]

    const faqs = [
        {
                        q: 'How much does it cost to rent ' + categoryLower + ' in Syracuse, NY?',
                        a: minPrice
                            ? 'Pricing starts at $' + minPrice.toFixed(2) + '/day and depends on the specific item, quantity, and rental duration. Call 315-884-1498 for an exact quote.'
                                            : 'Pricing depends on the specific item, quantity, and rental duration. Call 315-884-1498 for an exact quote.',
        },
        {
                        q: 'Do you deliver ' + categoryLower + ' near me?',
                        a: 'Yes. We deliver, set up, and pick up throughout Syracuse, Minoa, Cicero, Manlius, Camillus, Baldwinsville, Liverpool, and the surrounding Central New York area.',
        },
        {
                        q: 'How far in advance should I book ' + categoryLower + '?',
                        a: 'We recommend booking as early as possible, especially for weekends between May and September when dates fill up quickly. Call 315-884-1498 to check availability.',
        },
            {
                        q: 'Do I need to pay a deposit for  ' + categoryLower + '?',
                        a: 'Yes, a 33% deposit is required at booking to reserve your date. Deposits are non-refundable, but rainchecks are valid for one year. Call 315-884-1498 with any questions.',
        },
            ]

        const faqJsonLd = {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqs.map(function (f) {
                        return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }
                }),
        }

    const introText = categoryLabel + ' from Friendly Party Rental serve Syracuse, NY and the surrounding Central New York communities, including Minoa, Cicero, Manlius, Camillus, Baldwinsville, and Liverpool. Every rental includes delivery, setup, and pickup, and our team can help you choose the right options for your event.'

    const introEl = createElement('p', { className: 'text-gray-700 mb-10 leading-relaxed' }, introText)

    const whyChooseUsEl = createElement(
                'div',
        { className: 'grid sm:grid-cols-2 gap-4 mb-10' },
                ...whyChooseUs.map(function (w, i) {
                                return createElement(
                                                    'div',
                                    { key: i, className: 'flex items-start gap-2 bg-gray-50 border rounded-lg p-4 text-sm text-gray-700' },
                                                    createElement('span', { className: 'text-primary mt-0.5' }, String.fromCharCode(10003)),
                                                    createElement('span', null, w)
                                                )
                })
            )

    const faqEl = createElement(
                'div',
                null,
                createElement('h2', { className: 'text-xl font-bold text-dark mb-4' }, categoryLabel + ' FAQ'),
                ...faqs.map(function (f, i) {
                                return createElement(
                                                    'div',
                                    { key: i, className: 'mb-4' },
                                                    createElement('h3', { className: 'font-semibold text-dark mb-1' }, f.q),
                                                    createElement('p', { className: 'text-sm text-gray-700' }, f.a)
                                                )
                })
            )

        		const relatedCategories = [
                                { name: 'Tent Rentals', href: '/category/tent-rentals' },
                                { name: 'Table and Chair Rentals', href: '/category/table-chair-rentals' },
                                { name: 'Wedding Rentals', href: '/weddings' },
                                { name: 'Dance Floor Rentals', href: '/category/dance-floor-stage-rentals' },
                                { name: 'Linens', href: '/category/linen-rentals' },
                                { name: 'Event Lighting', href: '/category/event-lighting-rentals' },
                                		].filter(function (c) { return c.href.indexOf(slug) === -1 })

        		const relatedEl = createElement(
                                			'div',
                                { className: 'mt-10' },
                                			createElement('h2', { className: 'text-xl font-bold text-dark mb-4' }, 'Popular Categories'),
                                			createElement(
                                                                				'div',
                                                                { className: 'flex flex-wrap gap-3' },
                                                                				...relatedCategories.map(function (c, i) {
                                                                                                        					return createElement('a', { key: i, href: c.href, className: 'bg-gray-100 rounded-full px-4 py-2 text-blue-700 text-sm font-medium' }, c.name)
                                                                                                        })
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
                                		relatedEl
            )

    return createElement(
                Fragment,
                null,
                createElement(
                                Suspense,
                    { fallback: createElement('p', { className: 'text-center py-12' }, 'Loading...') },
                                createElement(CategoryClient, {
                                                    slug: slug,
                                                    initialCategory: initialCategory,
                                                    initialItems: initialItems,
                                })
                            ),
                seoSection
            )
}
