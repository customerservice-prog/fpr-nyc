'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Search, ShoppingCart } from 'lucide-react'
import { useCart } from './CartContext'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { itemCount } = useCart()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  const tabs = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Categories', href: '/category', icon: LayoutGrid },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch"
      style={{ height: 'calc(60px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
          >
            <Icon size={22} className={active ? 'text-secondary' : 'text-gray-500'} />
            <span className={`text-[11px] ${active ? 'text-secondary font-semibold' : 'text-gray-500'}`}>{tab.name}</span>
          </Link>
        )
      })}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-search'))}
        className="flex-1 flex flex-col items-center justify-center gap-0.5"
      >
        <Search size={22} className="text-gray-500" />
        <span className="text-[11px] text-gray-500">Search</span>
      </button>
      <Link href="/checkout" prefetch={false} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
        <span className="relative">
          <ShoppingCart size={22} className={isActive('/checkout') ? 'text-secondary' : 'text-gray-500'} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-accent text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </span>
        <span className={`text-[11px] ${isActive('/checkout') ? 'text-secondary font-semibold' : 'text-gray-500'}`}>Cart</span>
      </Link>
    </nav>
  )
}
