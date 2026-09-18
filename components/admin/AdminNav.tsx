'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Home,
  Settings,
  Calendar,
  Users,
  Ban,
  Truck,
  BarChart2,
  LineChart,
  Megaphone,
  Menu,
  X,
  LayoutTemplate,
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: Home, label: 'Home', ownerOnly: false },
  { href: '/admin/website', icon: LayoutTemplate, label: 'Edit Website', ownerOnly: false },
  { href: '/admin/settings', icon: Settings, label: 'Admin', ownerOnly: true },
  { href: '/admin/scheduling', icon: Calendar, label: 'Scheduling', ownerOnly: false },
  { href: '/admin/customers', icon: Users, label: 'Customers', ownerOnly: false },
  { href: '/admin/do-not-rent', icon: Ban, label: 'Do Not Rent', ownerOnly: false },
  { href: '/admin/delivery', icon: Truck, label: 'Delivery', ownerOnly: false },
  { href: '/admin/reports', icon: BarChart2, label: 'Reports', ownerOnly: true },
  { href: '/admin/analytics', icon: LineChart, label: 'Analytics', ownerOnly: true },
  { href: '/admin/marketing', icon: Megaphone, label: 'Marketing', ownerOnly: false },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === '/admin/login') return null

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/admin/login')
  }

  const role = (session?.user as { role?: string } | undefined)?.role || 'admin'
  const isAdmin = role === 'admin'
  const username = session?.user?.name || 'bryanp315'
  const visibleItems = navItems.filter((item) => !item.ownerOnly || isAdmin)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20" style={{ backgroundColor: '#2d6a2d', borderBottom: '3px solid #4CAF50' }}>
      <div className="flex items-center gap-4">
        <Link href="https://www.friendlypartyrentalsc.com" target="_blank" rel="noopener noreferrer">
          <Image
            src="/images/logo.png"
            alt="Friendly Party Rental"
            width={140}
            height={48}
            className="h-12 w-auto object-contain"
            unoptimized
          />
        </Link>
      </div>

      <div className="hidden lg:flex items-center gap-2">
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex flex-col items-center px-4 py-2 rounded hover:bg-green-700 transition-colors"
              style={{ color: isActive ? '#f5c518' : 'white' }}
            >
              <Icon size={24} />
              <span className="text-sm mt-1">{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <span className="text-white text-base">
          Signed in as <strong>{username}</strong> ({isAdmin ? 'Administrator' : 'Employee'})
        </span>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-base rounded text-white hover:bg-green-700 border border-green-500"
        >
          Logout
        </button>
      </div>

      <button
        className="lg:hidden text-white p-2"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white shadow-lg border-t max-h-[calc(100vh-4rem)] overflow-y-auto" style={{ borderColor: '#2d6a2d' }}>
          <div className="flex flex-col py-2">
            {visibleItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-base border-b border-gray-100"
                  style={{ color: isActive ? '#2d6a2d' : '#333', fontWeight: isActive ? 700 : 400, backgroundColor: isActive ? '#f0f7f0' : 'transparent' }}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              )
            })}
            <div className="px-5 py-3 text-sm text-gray-600 border-t mt-1">
              Signed in as <strong>{username}</strong> ({isAdmin ? 'Administrator' : 'Employee'})
            </div>
            <button
              onClick={handleSignOut}
              className="mx-5 my-2 px-3 py-2 text-sm rounded text-white bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
