import { createElement as h } from 'react'

function MetricCard(label: string) {
  return h(
    'div',
    { key: label, className: 'border border-gray-200 rounded-lg p-4' },
    h('div', { className: 'text-2xl font-bold text-gray-300' }, '\u2014'),
    h('div', { className: 'text-xs text-gray-500 mt-0.5' }, label)
    )
}

export default function PerformancePage() {
  return h(
    'div',
    { className: 'space-y-6' },
    h(
      'div',
      {},
      h('h2', { className: 'text-sm font-semibold text-gray-700' }, 'Performance'),
      h(
        'p',
        { className: 'text-sm text-gray-500 mt-1 max-w-3xl' },
        'No marketing campaigns have been sent yet, so there is no real performance data to show \u2014 these cards intentionally show a dash rather than a fake number. Once outbound sending is enabled and campaigns go out, results will appear here with bookings and revenue shown first, ahead of opens and clicks.'
        )
      ),
    h(
      'div',
      { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
      MetricCard('Bookings Attributed'),
      MetricCard('Booked Revenue'),
      MetricCard('Collected Revenue'),
      MetricCard('Conversion Rate'),
      MetricCard('Emails Delivered'),
      MetricCard('Open Rate'),
      MetricCard('Click Rate'),
      MetricCard('Unsubscribe Rate')
      )
    )
}
