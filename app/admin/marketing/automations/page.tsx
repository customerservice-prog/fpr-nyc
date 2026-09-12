import { createElement as h } from 'react'
import Link from 'next/link'
import { getMarketingSnapshot } from '@/lib/marketing/audience'
import { getCampaignBySlug, CAMPAIGN_LIBRARY } from '@/lib/marketing/campaignLibrary'

export const dynamic = 'force-dynamic'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function StatusBadge() {
  return h('span', { className: 'px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 whitespace-nowrap' }, 'Paused \u2014 Draft Only')
}

function AutomationRow(name: string, description: string, audienceLabel: string, slug: string) {
  return h(
    'div',
    { key: slug, className: 'border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4' },
    h(
      'div',
      {},
      h('div', { className: 'text-sm font-bold text-gray-900' }, name),
      h('p', { className: 'text-sm text-gray-600 mt-1 max-w-xl' }, description),
      h('div', { className: 'text-xs text-gray-500 mt-2' }, 'Audience right now: ' + audienceLabel),
      h(
        Link,
        { href: '/admin/marketing/campaigns/builder?slug=' + slug, className: 'inline-block mt-2 text-sm font-medium text-blue-700 hover:underline' },
        'Review Campaign \u2192'
        )
      ),
    StatusBadge()
    )
}

function SeasonalRow(slug: string) {
  const c = getCampaignBySlug(slug)
  if (!c) return null
  const windowLabel = c.months.length === 0 ? 'Always on' : c.months.map((m) => MONTH_ABBR[m - 1]).join(', ')
  return h(
    'div',
    { key: slug, className: 'border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4' },
    h(
      'div',
      {},
      h('div', { className: 'text-sm font-bold text-gray-900' }, c.name),
      h('p', { className: 'text-sm text-gray-600 mt-1 max-w-xl' }, c.goal),
      h('div', { className: 'text-xs text-gray-500 mt-2' }, 'Seasonal window: ' + windowLabel),
      h(
        Link,
        { href: '/admin/marketing/campaigns/builder?slug=' + slug, className: 'inline-block mt-2 text-sm font-medium text-blue-700 hover:underline' },
        'Review Campaign \u2192'
        )
      ),
    StatusBadge()
    )
}

export default async function AutomationsPage() {
  const snapshot = await getMarketingSnapshot()
  const seasonalSlugs = CAMPAIGN_LIBRARY.filter((c) => c.family === 'seasonal').map((c) => c.slug)

return h(
  'div',
  { className: 'space-y-8' },
  h(
    'div',
    {},
    h('h2', { className: 'text-sm font-semibold text-gray-700' }, 'Automations'),
    h(
      'p',
      { className: 'text-sm text-gray-500 mt-1 max-w-3xl' },
      'Every automation below is fully built but currently paused while the marketing system is being built. When turned on, they generate a draft that needs approval \u2014 none of them send anything automatically.'
      )
    ),
  h(
    'div',
    {},
    h('h3', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2' }, 'Lifecycle & Opportunity'),
    h(
     'div',
      { className: 'space-y-3' },
      AutomationRow(
        'Annual Rebooking',
        'Re-engages past customers roughly a year after their last event, before they consider a competitor.',
        snapshot.annualRebookingWindow.toLocaleString() + ' customer(s) 9\u201315 months past their last event',
        'annual-rebooking'
        ),
      AutomationRow(
        'Dormant Customer Winback',
        'Reaches out to customers who have not booked in 12+ months.',
        snapshot.dormant12PlusMonths.toLocaleString() + ' customer(s) 12+ months dormant',
        'dormant-winback'
        ),
      AutomationRow(
        'Open Availability Opportunity',
        'Generated when booking pace is running behind capacity for specific upcoming weekends, not on a fixed date.',
        snapshot.eligibleContacts.toLocaleString() + ' contact(s) eligible; date range set when the campaign is created',
        'open-availability-opportunity'
        )
      )
    ),
  h(
    'div',
    {},
    h('h3', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2' }, 'Seasonal'),
    h('div', { className: 'space-y-3' }, seasonalSlugs.map(SeasonalRow))
    )
  )
}
