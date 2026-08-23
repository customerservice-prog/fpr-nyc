'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/driver', label: 'Home / Stops' },
  { href: '/driver/clock', label: 'Clock In / Out' },
  { href: '/driver/load-sheet', label: 'Load Sheet' },
  { href: '/driver/tasks', label: 'Tasks' },
  { href: '/driver/card-reader', label: 'Card Reader' },
  { href: '/driver/control-panel', label: 'Control Panel' },
  { href: '/driver/legal', label: 'Legal' },
]

export default function DriverNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [driverName, setDriverName] = useState('')

  useEffect(() => {
    if (pathname === '/driver/login') return
    fetch('/api/driver/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.driver && d.driver.name) setDriverName(d.driver.name)
      })
      .catch(() => {})
  }, [pathname])

  if (pathname === '/driver/login') return null

  const logout = async () => {
    await fetch('/api/driver/login', { method: 'DELETE' })
    router.push('/driver/login')
  }

  return (
    <div className="bg-green-700 text-white sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="p-1 -ml-1"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold text-lg">FPR Drivers</span>
        </div>
        {driverName && <span className="text-sm">{driverName}</span>}
      </div>
      {open && (
        <div className="bg-white text-gray-800 border-t border-green-800 shadow-lg">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 border-b text-sm font-medium ${pathname === item.href ? 'bg-green-50 text-green-700' : ''}`}
            >
              {item.label}
            </a>
          ))}
          <button
            onClick={logout}
            className="block w-full text-left px-4 py-3 text-sm font-medium text-red-600"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
