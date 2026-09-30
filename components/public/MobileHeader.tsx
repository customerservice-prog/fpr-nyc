'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search, ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from './CartContext'
import { BUSINESS, NAV_RENTALS } from '@/lib/utils'
import { NYC_LOGO_PATH, NYC_LOGO_WIDTH, NYC_LOGO_HEIGHT, NYC_LOGO_ALT } from '@/lib/nycBrand'
import { useRentalSearch } from '@/lib/useRentalSearch'
import { rentalItemHref } from '@/lib/nycRentalSearch'
import { openNycMobileModal } from '@/lib/nycModal'

const LOGO_URL = NYC_LOGO_PATH
const MENU_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Shop All Rentals', href: '/category' },
  { name: 'Weddings', href: '/weddings' },
  { name: 'Event Planning', href: '/event-planning' },
  { name: 'Design Your Event', href: '/design-your-event' },
  { name: 'Order By Date', href: '/order-by-date' },
  { name: 'FAQs', href: '/frequently_asked_questions' },
  { name: 'About Us', href: '/about_us' },
  { name: 'Contact Us', href: '/contact_us' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Employment', href: '/employment' },
  { name: 'Service Area', href: '/service-area' },
]

export default function MobileHeader() {
  const pathname = usePathname()
  const { itemCount } = useCart()
  // One panel state prevents the menu and search from stacking on each other.
  const [panel, setPanel] = useState<'menu' | 'search' | null>(null)
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelId = useId()
  const search = useRentalSearch(query, panel === 'search')
  const closePanel = useCallback(() => { setPanel(null); setQuery('') }, [])

  useEffect(() => {
    if (panel === null || !dialogRef.current) return
    return openNycMobileModal(dialogRef.current, closePanel)
  }, [panel, closePanel])
  useEffect(() => { closePanel() }, [pathname, closePanel])
  useEffect(() => {
    const openSearch = () => { if (window.innerWidth < 768) setPanel('search') }
    window.addEventListener('open-mobile-search', openSearch)
    return () => window.removeEventListener('open-mobile-search', openSearch)
  }, [])

  return <>
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[104px] flex items-center px-2">
      <button type="button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={panel === 'menu'}
        aria-controls={panel === 'menu' ? panelId : undefined} onClick={() => setPanel('menu')}
        className="p-3 -ml-1 flex flex-col items-center justify-center text-gray-900">
        <Menu size={26} strokeWidth={2.3} aria-hidden="true" /><span className="text-[10px] font-semibold mt-0.5 leading-none">Menu</span>
      </button>
      <Link href="/" prefetch={false} className="flex-1 min-w-0 flex justify-center px-1"><img src={LOGO_URL} alt={NYC_LOGO_ALT} width={NYC_LOGO_WIDTH} height={NYC_LOGO_HEIGHT} className="block w-full max-w-[200px] h-auto" /></Link>
      <div className="flex items-center">
        <button type="button" aria-label="Search" aria-haspopup="dialog" aria-expanded={panel === 'search'}
          aria-controls={panel === 'search' ? panelId : undefined} onClick={() => setPanel('search')} className="p-3">
          <Search size={22} aria-hidden="true" />
        </button>
        <Link aria-label="Cart" href="/checkout" prefetch={false} className="p-3 relative">
          <ShoppingCart size={22} aria-hidden="true" />
          {itemCount > 0 && <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">{itemCount > 9 ? '9+' : itemCount}</span>}
        </Link>
      </div>
    </header>

    {panel !== null && <dialog key={panel} ref={dialogRef} id={panelId} tabIndex={-1} aria-modal="true"
      aria-label={panel === 'menu' ? 'Mobile navigation' : 'Search rental items'}
      data-nyc-mobile-panel={panel}
      onClick={event => { if (panel === 'menu' && event.target === event.currentTarget) closePanel() }}
      className={'fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 p-0 overflow-hidden backdrop:bg-black/50 ' + (panel === 'menu' ? 'bg-transparent' : 'bg-white')}>
      {panel === 'menu' ? <div className="h-full w-[82%] max-w-xs bg-white shadow-xl overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between px-4 h-[64px] border-b border-gray-200">
          <span className="font-bold text-dark">Menu</span>
          <button type="button" data-nyc-initial-focus aria-label="Close menu" onClick={closePanel} className="p-2"><X size={24} aria-hidden="true" /></button>
        </div>
        <nav className="py-2" aria-label="Mobile navigation">
          {[
            { title: 'Rentals', links: NAV_RENTALS.filter((item): item is { name: string; href: string } => 'href' in item) },
            { title: 'Services', links: MENU_LINKS.filter(item => ['/weddings', '/event-planning', '/design-your-event', '/service-area'].includes(item.href)) },
            { title: 'Help', links: MENU_LINKS.filter(item => ['/', '/frequently_asked_questions', '/about_us', '/contact_us', '/gallery', '/employment'].includes(item.href)) },
          ].map(group => <section key={group.title}>
            <h2 className="bg-gray-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-gray-500">{group.title}</h2>
            {group.links.map(link => <Link key={link.href} href={link.href} prefetch={false} onClick={closePanel}
              className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-dark">{link.name}</Link>)}
          </section>)}
        </nav>
        <div className="p-4 space-y-2 text-sm text-body">
          <a href={`tel:${BUSINESS.phone}`} className="block font-bold text-dark">{BUSINESS.phone}</a>
          <p className="text-xs text-gray-500 mt-1">Mon–Sat: 9am–6pm</p>
          <a href={BUSINESS.emailHref} className="block break-all">{BUSINESS.email}</a>
        </div>
      </div> : <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-3 h-[64px] border-b border-gray-200 flex-shrink-0">
          <Search size={20} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
          <input type="search" data-nyc-initial-focus aria-label="Search rental items" autoComplete="off" spellCheck={false}
            value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rentals..."
            className="flex-1 outline-none text-base min-w-0" />
          <button type="button" aria-label="Close search" onClick={closePanel} className="p-2 flex-shrink-0"><X size={24} aria-hidden="true" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain" aria-busy={search.status === 'loading'}>
          {search.status === 'idle' && <p className="p-4 text-body text-sm">Enter at least 2 characters to search rentals.</p>}
          {search.status === 'loading' && <p role="status" className="p-4 text-body text-sm">Searching...</p>}
          {search.status === 'error' && <div className="p-4 text-body text-sm">
            <p role="alert">{search.error}</p>
            <button type="button" onClick={search.retry} className="mt-3 font-semibold text-primary underline">Try again</button>
            <Link href="/category" prefetch={false} onClick={closePanel} className="ml-4 underline">Browse rentals</Link>
          </div>}
          {search.status === 'success' && search.items.length === 0 && <p role="status" className="p-4 text-body text-sm">No rentals found for &quot;{query.trim()}&quot;.</p>}
          {search.status === 'success' && search.items.length > 0 && <>
            <p role="status" className="sr-only">{search.items.length} rental results.</p>
            <ul aria-label="Rental search results">{search.items.map(item => <li key={item.id}>
              <Link href={rentalItemHref(item)} prefetch={false} onClick={closePanel}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="min-w-0 pr-3">
                  <p className="font-medium text-dark text-sm truncate">{item.name}</p>
                  {item.category && <p className="text-xs text-body truncate">{item.category.name}</p>}
                </div>
                {item.cost !== null && item.cost > 0 && <p className="text-sm font-bold text-dark flex-shrink-0">${item.cost.toFixed(2)}</p>}
              </Link>
            </li>)}</ul>
          </>}
        </div>
      </div>}
    </dialog>}
  </>
}
