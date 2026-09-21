'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search, ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from './CartContext'
import { BUSINESS, NAV_RENTALS } from '@/lib/utils'

const LOGO_URL = '/images/logo.png'

interface SearchItem {
  id: string
  name: string
  slug: string | null
  cost: number | null
  category?: { name: string | null } | null
}

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/items?search=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.items || [])
        setResults(list.slice(0, 8))
      } catch {} finally { setLoading(false) }
    }, 300)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    if (!menuOpen && !searchOpen) return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const close=()=>{setMenuOpen(false);setSearchOpen(false)}
    const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape')close()}
    const resize=()=>{if(window.innerWidth>=768)close()}
    window.addEventListener('keydown',keyboard);window.addEventListener('resize',resize)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',keyboard);window.removeEventListener('resize',resize)}
  },[menuOpen,searchOpen])
  useEffect(()=>{setMenuOpen(false);setSearchOpen(false)},[pathname])
  useEffect(() => { function handler() { setSearchOpen(true) } window.addEventListener('open-mobile-search', handler); return () => window.removeEventListener('open-mobile-search', handler) }, [])

  return <>
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[96px] flex items-center px-2">
      <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="p-3 -ml-1 flex flex-col items-center justify-center text-gray-900"><Menu size={26} strokeWidth={2.3} /><span className="text-[10px] font-semibold mt-0.5 leading-none">Menu</span></button>
      <Link href="/" prefetch={false} className="flex-1 flex justify-center"><Image src={LOGO_URL} alt="Friendly Party Rental" width={280} height={76} className="h-[76px] w-auto object-contain" /></Link>
      <div className="flex items-center"><button aria-label="Search" onClick={() => setSearchOpen(true)} className="p-3"><Search size={22} /></button><Link aria-label="Cart" href="/checkout" prefetch={false} className="p-3 relative"><ShoppingCart size={22} />{itemCount > 0 && <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">{itemCount > 9 ? '9+' : itemCount}</span>}</Link></div>
    </header>

    {menuOpen && <div className="fixed inset-0 z-[90]"><div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} /><div className="absolute top-0 left-0 bottom-0 w-[82%] max-w-xs bg-white shadow-xl overflow-y-auto"><div className="flex items-center justify-between px-4 h-[64px] border-b border-gray-200"><span className="font-bold text-dark">Menu</span><button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="p-2"><X size={24} /></button></div><nav className="py-2" aria-label="Mobile navigation">{[{title:'Rentals',links:NAV_RENTALS.filter((x): x is {name:string;href:string} => 'href' in x)},{title:'Services',links:MENU_LINKS.filter(x=>['/weddings','/event-planning','/design-your-event','/service-area'].includes(x.href))},{title:'Help',links:MENU_LINKS.filter(x=>['/','/frequently_asked_questions','/about_us','/contact_us','/gallery','/employment'].includes(x.href))}].map(group=><section key={group.title}><h2 className="bg-gray-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-gray-500">{group.title}</h2>{group.links.map(link=><Link key={link.href} href={link.href} prefetch={false} onClick={()=>setMenuOpen(false)} className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-dark">{link.name}</Link>)}</section>)}</nav><div className="p-4 space-y-2 text-sm text-body"><a href={`tel:${BUSINESS.phone}`} className="block font-bold text-dark">{BUSINESS.phone}</a><p className="text-xs text-gray-500 mt-1">Mon–Sat: 9am–6pm</p><a href={BUSINESS.emailHref} className="block break-all">{BUSINESS.email}</a></div></div></div>}

    {searchOpen && <div className="fixed inset-0 z-[90] bg-white flex flex-col"><div className="flex items-center gap-2 px-3 h-[64px] border-b border-gray-200 flex-shrink-0"><Search size={20} className="text-gray-400 flex-shrink-0" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search rentals..." className="flex-1 outline-none text-base min-w-0" /><button aria-label="Close search" onClick={() => { setSearchOpen(false); setQuery(''); setResults([]) }} className="p-2 flex-shrink-0"><X size={24} /></button></div><div className="flex-1 overflow-y-auto">{loading && <p className="p-4 text-body text-sm">Searching...</p>}{!loading && query.trim().length >= 2 && results.length === 0 && <p className="p-4 text-body text-sm">No rentals found.</p>}{results.map(item => <Link key={item.id} href={item.slug ? `/items/${item.slug}` : '#'} prefetch={false} onClick={() => setSearchOpen(false)} className="flex items-center justify-between px-4 py-3 border-b border-gray-100"><div className="min-w-0 pr-3"><p className="font-medium text-dark text-sm truncate">{item.name}</p>{item.category?.name && <p className="text-xs text-body truncate">{item.category.name}</p>}</div>{item.cost != null && <p className="text-sm font-bold text-dark flex-shrink-0">${item.cost.toFixed(2)}</p>}</Link>)}</div></div>}
  </>
}
