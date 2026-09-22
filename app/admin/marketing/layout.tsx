'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/marketing', label: 'Overview' },
  { href: '/admin/marketing/automations', label: 'Automatic marketing' },
  { href: '/admin/marketing/campaigns', label: 'Campaign library' },
  { href: '/admin/marketing/audiences', label: 'Audiences' },
  { href: '/admin/marketing/performance', label: 'Performance' },
  { href: '/admin/marketing/history', label: 'Send history' },
  { href: '/admin/marketing/scheduler', label: 'Review queue' },
  { href: '/admin/marketing/calendar', label: 'Seasonal calendar' },
  { href: '/admin/marketing/settings', label: 'Settings' },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin/marketing'
  return <div className="mx-auto max-w-7xl"><div className="px-4 pb-4 pt-6 sm:px-6"><h1 className="text-2xl font-bold tracking-tight text-gray-950">Marketing</h1><p className="mt-1 text-sm text-gray-500">Bring customers back and see which campaigns lead to bookings.</p></div><nav aria-label="Marketing sections" className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 sm:px-6">{TABS.map(tab => {
    const active = tab.href === '/admin/marketing' ? pathname === tab.href : pathname.startsWith(tab.href)
    return <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${active ? 'border-green-800 text-green-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'}`}>{tab.label}</Link>
  })}</nav><div className="p-4 sm:p-6">{children}</div></div>
}
