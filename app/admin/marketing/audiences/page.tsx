import { createElement as h } from 'react'
import { getMarketingSnapshot } from '@/lib/marketing/audience'

export const dynamic = 'force-dynamic'

function StatCard(label: string, value: number, hint?: string) {
  return h(
    'div',
    { key: label, className: 'border border-gray-200 rounded-lg p-4' },
    h('div', { className: 'text-2xl font-bold text-gray-900' }, value.toLocaleString()),
    h('div', { className: 'text-xs text-gray-500 mt-0.5' }, label),
    hint ? h('div', { className: 'text-xs text-gray-400 mt-1' }, hint) : null
    )
}

function ExclusionRow(label: string, value: number, explanation: string) {
  return h(
    'li',
    { key: label, className: 'flex items-start justify-between gap-4 py-2.5' },
    h(
      'div',
      {},
      h('div', { className: 'text-sm text-gray-800' }, label),
      h('div', { className: 'text-xs text-gray-400 mt-0.5 max-w-md' }, explanation)
      ),
    h('div', { className: 'text-sm font-semibold text-gray-700 whitespace-nowrap' }, value.toLocaleString())
    )
}

export default async function AudiencesPage() {
  const snapshot = await getMarketingSnapshot()
  const totalExcluded = snapshot.excluded.invalidFormat + snapshot.excluded.testRecord + snapshot.excluded.suppressed + snapshot.excluded.duplicate

return h(
  'div',
  { className: 'space-y-8' },
  h(
    'div',
    {},
    h('h2', { className: 'text-sm font-semibold text-gray-700' }, 'Who Marketing Can Reach Right Now'),
    h(
      'p',
      { className: 'text-sm text-gray-500 mt-1 max-w-3xl' },
      'These numbers are computed live from the Customer and Order tables every time this page loads \u2014 nothing here is a fixed or estimated figure. Two customer records with the same email are counted once.'
      )
    ),
  h(
    'div',
    { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
    StatCard('Eligible Contacts', snapshot.eligibleContacts, 'Can receive marketing today'),
    StatCard('Total Customer Records', snapshot.totalCustomerRecords),
    StatCard('Unique Email Identities', snapshot.uniqueEmailIdentities),
    StatCard('Paying Reachable Customers', snapshot.payingReachableCustomers, 'Eligible + has a paid order'),
    StatCard('Dormant 12+ Months', snapshot.dormant12PlusMonths, 'Last event 365+ days ago'),
    StatCard('Annual Rebooking Window', snapshot.annualRebookingWindow, 'Last event 9\u201315 months ago'),
    StatCard('Upcoming Event Customers', snapshot.upcomingEventCustomers, 'Has a future event on the books'),
    StatCard('Campaign Drafts Saved', snapshot.campaignDraftRecords)
    ),
  h(
    'div',
    { className: 'border border-gray-200 rounded-lg p-5' },
    h('h3', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1' }, 'Who Is Excluded, and Why'),
    h('p', { className: 'text-sm text-gray-500 mb-2' }, totalExcluded.toLocaleString() + ' contact(s) are currently excluded from marketing.'),
    h(
      'ul',
      { className: 'divide-y divide-gray-100' },
      ExclusionRow('Unsubscribed or Restricted', snapshot.excluded.suppressed, 'Unsubscribed from marketing emails, hard-bounced, marked as a complaint, or under a Do Not Rent restriction.'),
      ExclusionRow('Invalid Email Format', snapshot.excluded.invalidFormat, 'The email on file is missing or not a valid, deliverable address.'),
      ExclusionRow('Test / Internal Record', snapshot.excluded.testRecord, 'Looks like an internal or test record rather than a real customer.'),
      ExclusionRow('Duplicate Email', snapshot.excluded.duplicate, 'Same email identity already counted once for a different customer record.')
      )
    ),
  h(
    'p',
    { className: 'text-xs text-gray-400' },
    'Snapshot generated ' + new Date(snapshot.generatedAt).toLocaleString() + '.'
    )
  )
}
