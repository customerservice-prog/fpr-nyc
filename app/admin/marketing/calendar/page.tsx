import { createElement as h } from 'react'
import Link from 'next/link'
import MarketingReviewQueue from '@/components/admin/MarketingReviewQueue'
import { CAMPAIGN_LIBRARY } from '@/lib/marketing/campaignLibrary'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MonthCard(monthIndex: number) {
  const monthNum = monthIndex + 1
  const items = CAMPAIGN_LIBRARY.filter((c) => c.family === 'seasonal' && c.months.includes(monthNum))
  return h(
    'div',
    { key: monthNum, className: 'border border-gray-200 rounded-lg p-4 min-h-[120px]' },
    h('div', { className: 'text-sm font-bold text-gray-900 mb-2' }, MONTH_NAMES[monthIndex]),
    items.length === 0
    ? h('div', { className: 'text-xs text-gray-400' }, 'No seasonal recommendation.')
    : h(
      'ul',
      { className: 'space-y-1' },
      items.map((c) =>
        h(
          'li',
          { key: c.slug },
          h(
            Link,
            { href: '/admin/marketing/campaigns/builder?slug=' + c.slug, className: 'text-sm text-blue-700 hover:underline' },
            c.name
            )
          )
                )
      )
    )
}

function AlwaysOnCard(c: (typeof CAMPAIGN_LIBRARY)[number]) {
  return h(
    'div',
    { key: c.slug, className: 'border border-gray-200 rounded-lg p-4' },
    h('div', { className: 'text-sm font-bold text-gray-900' }, c.name),
    h('p', { className: 'text-sm text-gray-600 mt-1' }, c.goal),
    h(
      Link,
      { href: '/admin/marketing/campaigns/builder?slug=' + c.slug, className: 'inline-block mt-2 text-sm font-medium text-blue-700 hover:underline' },
      'Open in Builder \u2192'
      )
    )
}

export default function CalendarPage() {
  const alwaysOn = CAMPAIGN_LIBRARY.filter((c) => c.family !== 'seasonal')
  const months = Array.from({ length: 12 }, (_, i) => i)

return h(
  'div',
  { className: 'space-y-8' },
  h(MarketingReviewQueue),
  h(
    'div',
    {},
    h('h2', { className: 'text-sm font-semibold text-gray-700' }, 'Seasonal Campaign Ideas'),
    h(
      'p',
      { className: 'text-sm text-gray-500 mt-1 max-w-3xl' },
      'These campaign ideas are grouped by season. They are recommendations, not scheduled customer sends. Your saved custom-campaign review dates appear above. Automatic campaign selections and their next eligible checks are available in Automatic marketing.'
      )
    ),
  h(Link, { href: '/admin/marketing/automations', className: 'inline-block text-sm font-semibold text-green-800 underline' }, 'View automatic campaigns and real scheduling →'),
  h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' }, months.map(MonthCard)),
  h(
    'div',
    {},
    h('h2', { className: 'text-sm font-semibold text-gray-700 mb-1' }, 'Year-Round Campaign Ideas'),
    h('p', { className: 'text-sm text-gray-500 mb-4 max-w-3xl' }, 'Not tied to a calendar month \u2014 review these against customer history and current business conditions before launching.'),
    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' }, alwaysOn.map(AlwaysOnCard))
    )
  )
}

