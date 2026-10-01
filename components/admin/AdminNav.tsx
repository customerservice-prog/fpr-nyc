'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { NYC_LOGO_PATH, NYC_LOGO_WIDTH, NYC_LOGO_HEIGHT } from '@/lib/nycBrand'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'
import { hasStaffPermission, staffRoleLabel, type StaffPermission } from '@/lib/staffPermissions'
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

const navItems: Array<{ href: string; icon: any; label: string; permission?: StaffPermission }> = [
  { href: '/admin', icon: Home, label: 'Home' },
  { href: '/admin/website', icon: LayoutTemplate, label: 'Edit Website', permission: 'website' },
  { href: '/admin/settings', icon: Settings, label: 'Admin', permission: 'owner_settings' },
  { href: '/admin/scheduling', icon: Calendar, label: 'Scheduling', permission: 'scheduling' },
  { href: '/admin/customers', icon: Users, label: 'Customers', permission: 'customers' },
  { href: '/admin/do-not-rent', icon: Ban, label: 'Do Not Rent', permission: 'customers' },
  { href: '/admin/delivery', icon: Truck, label: 'Delivery', permission: 'delivery' },
  { href: '/admin/reports', icon: BarChart2, label: 'Reports', permission: 'reports' },
  { href: '/admin/analytics', icon: LineChart, label: 'Analytics', permission: 'analytics' },
  { href: '/admin/marketing', icon: Megaphone, label: 'Marketing', permission: 'marketing' },
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

  const role = (session?.user as { role?: string } | undefined)?.role || 'employee'
  const username = session?.user?.name || 'Staff'
  const visibleItems = navItems.filter((item) => !item.permission || hasStaffPermission(role, item.permission))

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-3 xl:gap-4 xl:px-6 h-20"
      style={{ backgroundColor: '#2d6a2d', borderBottom: '3px solid #4CAF50' }}
    >
      <div className="flex w-16 shrink-0 items-center xl:w-20 2xl:w-auto">
        <Link
          href={NYC_PUBLIC_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Friendly Party Rental NYC website"
          className="block shrink-0"
        >
          <Image
            src={NYC_LOGO_PATH}
            alt="Friendly Party Rental NYC"
            width={NYC_LOGO_WIDTH}
            height={NYC_LOGO_HEIGHT}
            className="h-12 w-auto max-w-full object-contain"
            unoptimized
          />
        </Link>
      </div>

      <div className="hidden lg:flex min-w-0 flex-1 items-center justify-around">
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex min-w-0 flex-1 flex-col items-center px-1 xl:px-2 2xl:px-4 py-1 rounded hover:bg-green-700 transition-colors"
              style={{ color: isActive ? '#f5c518' : 'white' }}
            >
              <Icon size={24} />
              <span className="mt-1 text-center text-xs leading-4 xl:text-sm xl:leading-4">{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="hidden lg:flex shrink-0 items-center gap-2 xl:gap-4">
        <span className="block w-32 text-sm leading-5 text-white xl:w-40 xl:text-base xl:leading-6 2xl:w-auto 2xl:max-w-56">
          Signed in as <strong>{username}</strong> ({role === 'admin' ? 'Administrator' : staffRoleLabel(role)})
        </span>
        <button
          onClick={handleSignOut}
          className="px-3 xl:px-4 py-2 text-sm xl:text-base rounded text-white hover:bg-green-700 border border-green-500"
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
        <div className="lg:hidden absolute top-20 left-0 right-0 bg-white shadow-lg border-t max-h-[calc(100vh-5rem)] overflow-y-auto" style={{ borderColor: '#2d6a2d' }}>
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
              Signed in as <strong>{username}</strong> ({staffRoleLabel(role)})
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
