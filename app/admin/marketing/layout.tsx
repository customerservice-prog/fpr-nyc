'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string }[] = [
  { href: '/admin/marketing', label: 'Overview' },
  { href: '/admin/marketing/calendar', label: 'Calendar' },
  { href: '/admin/marketing/campaigns', label: 'Campaigns' },
  { href: '/admin/marketing/audiences', label: 'Audiences' },
  { href: '/admin/marketing/automations', label: 'Automations' },
  { href: '/admin/marketing/performance', label: 'Performance' },
  { href: '/admin/marketing/settings', label: 'Settings' },
  ]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/admin/marketing'

  return (
        <div className="max-w-7xl mx-auto">
              <div className="px-6 pt-6 pb-2">
                      <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
                      <p className="text-sm text-gray-500 mt-0.5">Friendly Party Rental&apos;s marketing operating system - campaigns, audiences, and automations in one place.</p>
              </div>
              <div className="px-6 border-b border-gray-200">
                      <nav className="flex gap-1 overflow-x-auto -mb-px">
                        {TABS.map((t) => {
                      const active = t.href === '/admin/marketing' ? pathname === t.href : pathname.startsWith(t.href)
                                    return (
                                                    <Link
                                                                      key={t.href}
                                                                      href={t.href}
                                                                      className={
                                                                                          'px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ' +
                                                                                          (active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300')
                                                                      }
                                                                    >
                                                      {t.label}
                                                    </Link>
                                                  )
        })}
                      </nav>
              </div>
              <div className="p-6">{children}</div>
        </div>
      )
}
