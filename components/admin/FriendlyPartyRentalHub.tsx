'use client'

import { ExternalLink, LayoutDashboard, WandSparkles } from 'lucide-react'

const extraTools = [
  {
    label: 'Use RentSketch',
    href: 'https://rentsketch.com/designer/?tenant=friendly-nyc',
    description: 'Create a Friendly Party Rental NYC event layout.',
    icon: WandSparkles,
  },
  {
    label: 'RentSketch Admin',
    href: 'https://rentsketch.com/dashboard/platform.html#overview',
    description: 'Open the RentSketch business dashboard.',
    icon: LayoutDashboard,
  },
]

export default function FriendlyPartyRentalHub() {
  return (
    <section aria-label="Additional tools" className="grid gap-3 sm:grid-cols-2">
      {extraTools.map(({ label, href, description, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-green-700 hover:bg-green-50"
        >
          <Icon size={24} className="shrink-0 text-green-800" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-green-800">{label}</span>
            <span className="mt-1 block text-sm text-gray-500">{description}</span>
          </span>
          <ExternalLink size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
        </a>
      ))}
    </section>
  )
}
