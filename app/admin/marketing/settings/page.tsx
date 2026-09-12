import { createElement as h } from 'react'

function Row(label: string, status: string, on: boolean) {
  return h(
    'li',
    { key: label, className: 'flex items-center justify-between py-2.5 text-sm' },
    h('span', { className: 'text-gray-700' }, label),
    h(
      'span',
      { className: 'px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ' + (on ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500') },
      status
      )
    )
}

export default function SettingsPage() {
  return h(
    'div',
    { className: 'space-y-8 max-w-3xl' },
    h(
      'div',
      { className: 'rounded-lg border border-blue-200 bg-blue-50 px-4 py-3' },
      h('span', { className: 'text-xs font-semibold uppercase tracking-wide text-blue-700' }, 'Automation Mode: Draft Only'),
      h(
        'p',
        { className: 'text-sm text-blue-900 mt-1' },
        'Outbound marketing is disabled at the server level while the system is being built. This cannot be turned on from this screen \u2014 it requires a code change and a deploy, on purpose, so a stray click can never send a real email to a customer.'
        )
      ),
    h(
      'div',
      { className: 'border border-gray-200 rounded-lg p-5' },
      h('h3', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2' }, 'What\u2019s Enabled Right Now'),
      h(
        'ul',
        { className: 'divide-y divide-gray-100' },
        Row('Building and editing campaigns', 'Enabled', true),
        Row('Viewing live audience numbers', 'Enabled', true),
        Row('Saving campaign drafts', 'Enabled', true),
        Row('Sending a campaign to real customers', 'Disabled', false),
        Row('Sending a test email to any address', 'Disabled', false),
        Row('Scheduled or automatic sends', 'Disabled', false)
        )
      ),
    h(
      'div',
      { className: 'border border-gray-200 rounded-lg p-5' },
      h('h3', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2' }, 'How Sending Gets Turned Back On'),
      h(
        'p',
        { className: 'text-sm text-gray-600' },
        'When the marketing system is fully tested \u2014 unsubscribe handling, Do Not Rent exclusions, and audience calculations all verified against real data \u2014 outbound sending will be re-enabled deliberately, one channel and one audience at a time, starting with a small test group before any full send.'
        )
      )
    )
}
