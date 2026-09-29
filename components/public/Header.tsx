'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Facebook, Youtube, ChevronDown } from 'lucide-react'
import { BUSINESS, NAV_RENTALS } from '@/lib/utils'
import HeaderSearch from './HeaderSearch'
import { NYC_LOGO_PATH, NYC_LOGO_WIDTH, NYC_LOGO_HEIGHT } from '@/lib/nycBrand'

const LOGO_URL = NYC_LOGO_PATH
const defaultNavLinks = [
  { name: 'Home', href: '/' },
  { name: 'Weddings', href: '/weddings' },
  { name: 'Event Planning', href: '/event-planning' },
  { name: 'Rentals', href: '/category', hasDropdown: true },
  { name: 'FAQs', href: '/frequently_asked_questions' },
  { name: 'About Us', href: '/about_us' },
  { name: 'Contact Us', href: '/contact_us' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Employment', href: '/employment' },
  { name: 'Service Area', href: '/service-area' },
]
interface NavLinkItem { label: string; url: string }
type HeaderMode = 'standard' | 'compact' | 'logoOnly' | 'noLogo' | 'cover' | 'blackbar' | 'inline'
interface HeaderCfg {
  topBar: boolean
  align: 'start' | 'center' | 'end' | 'between'
  mode: HeaderMode
  grayscale?: boolean
  logoLarge?: boolean
  coverFg?: 'blue' | 'black' | 'white'
  logoSide?: 'left' | 'right'
  textColor?: 'white' | 'black'
}
const HEADER_CONFIG: Record<number, HeaderCfg> = {
  1: { topBar: true, align: 'center', mode: 'standard' },
  6: { topBar: true, align: 'center', mode: 'standard', grayscale: true },
  2: { topBar: false, align: 'between', mode: 'compact' },
  3: { topBar: true, align: 'center', mode: 'standard' },
  12: { topBar: false, align: 'center', mode: 'logoOnly' },
  11: { topBar: true, align: 'center', mode: 'standard', logoLarge: true },
  4: { topBar: false, align: 'end', mode: 'noLogo' },
  15: { topBar: false, align: 'start', mode: 'noLogo' },
  14: { topBar: false, align: 'center', mode: 'noLogo' },
  5: { topBar: false, align: 'center', mode: 'cover', coverFg: 'blue' },
  8: { topBar: false, align: 'center', mode: 'cover', coverFg: 'black' },
  9: { topBar: false, align: 'center', mode: 'cover', coverFg: 'white' },
  10: { topBar: true, align: 'center', mode: 'blackbar' },
  16: { topBar: false, align: 'end', mode: 'inline', logoSide: 'left', textColor: 'white' },
  20: { topBar: false, align: 'end', mode: 'inline', logoSide: 'left', textColor: 'black' },
  17: { topBar: false, align: 'start', mode: 'inline', logoSide: 'right', textColor: 'white' },
  21: { topBar: false, align: 'start', mode: 'inline', logoSide: 'right', textColor: 'black' },
  13: { topBar: true, align: 'between', mode: 'standard' },
  7: { topBar: true, align: 'between', mode: 'standard' },
}
export default function Header({ navItems, headerStyle = 1 }: { navItems?: NavLinkItem[]; headerStyle?: number }) {
  const pathname = usePathname()
  const [rentalsOpen, setRentalsOpen] = useState(false)
  const navLinks = navItems && navItems.length > 0
    ? navItems.map((item) => ({ name: item.label, href: item.url, hasDropdown: item.url === '/category' }))
    : [...defaultNavLinks]
  if (!navLinks.some(link => link.href === '/design-your-event')) navLinks.splice(Math.min(4,navLinks.length),0,{name:'Design Your Event',href:'/design-your-event',hasDropdown:false})
  const cfg = HEADER_CONFIG[headerStyle] || HEADER_CONFIG[1]
  useEffect(() => { setRentalsOpen(false) }, [pathname])
  useEffect(() => {
    if (!rentalsOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setRentalsOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [rentalsOpen])
  const dropdown = (
    <div id="desktop-rental-navigation" className="absolute top-full left-0 z-50 bg-white border shadow-lg rounded min-w-[280px] py-2 max-h-96 overflow-y-auto text-dark">
      {NAV_RENTALS.map((item, idx) => 'separator' in item ? <hr key={idx} className="my-1 border-gray-200" /> : (
        <Link key={idx} href={item.href} onClick={() => setRentalsOpen(false)} className="block px-4 py-2 text-sm text-dark hover:bg-gray-100" prefetch={false}>{item.name}</Link>
      ))}
    </div>
  )
  function renderNav(textCls: string, justifyCls: string) {
    return <ul className={'flex flex-wrap items-center gap-x-1 lg:gap-x-0 py-2 ' + justifyCls}>
      {navLinks.map((link) => <li key={link.name} className="relative">
        {link.hasDropdown ? <button type="button" aria-expanded={rentalsOpen} aria-controls="desktop-rental-navigation" onClick={() => setRentalsOpen(!rentalsOpen)} className={'flex items-center gap-0.5 px-2 lg:px-3 py-2 font-medium text-sm whitespace-nowrap hover:opacity-80 ' + textCls}>{link.name}<ChevronDown size={14}/></button> : <Link href={link.href} prefetch={false} className={'px-2 lg:px-3 py-2 font-medium text-sm block whitespace-nowrap hover:opacity-80 ' + textCls}>{link.name}</Link>}
        {link.hasDropdown && rentalsOpen && <><div className="fixed inset-0 z-40" onClick={() => setRentalsOpen(false)}/>{dropdown}</>}
      </li>)}
    </ul>
  }
  // The logo is the exact 2:1 artwork: the box is sized around it (full width of its
  // column, capped) and the height follows the ratio, so it is never cropped or squashed.
  const logo = <Link href="/" prefetch={false} className={'block w-full ' + (cfg.logoLarge ? 'max-w-[340px]' : 'max-w-[300px]')}><img src={LOGO_URL} alt={BUSINESS.name} width={NYC_LOGO_WIDTH} height={NYC_LOGO_HEIGHT} className={(cfg.grayscale ? 'grayscale ' : '') + 'block w-full h-auto'}/></Link>
  if (cfg.mode === 'cover') {
    const fgClass = cfg.coverFg === 'black' ? 'text-dark' : 'text-white'
    return <header className="w-full bg-gradient-to-r from-secondary via-primary to-secondary"><div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center gap-3"><Link href="/" prefetch={false} className="block w-[240px] max-w-full"><img src={LOGO_URL} alt={BUSINESS.name} width={NYC_LOGO_WIDTH} height={NYC_LOGO_HEIGHT} className="block w-full h-auto"/></Link>{renderNav(fgClass, 'justify-center')}</div></header>
  }
  if (cfg.mode === 'inline') {
    const textCls = cfg.textColor === 'black' ? 'text-dark' : 'text-white'
    const logoEl = <Link href="/" prefetch={false} className="block w-[200px] max-w-full shrink-0"><img src={LOGO_URL} alt={BUSINESS.name} width={NYC_LOGO_WIDTH} height={NYC_LOGO_HEIGHT} className="block w-full h-auto"/></Link>
    const navEl = renderNav(textCls, 'justify-start lg:justify-end')
    return <header className="w-full bg-gradient-to-r from-secondary to-primary"><div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-4">{cfg.logoSide === 'right' ? <>{navEl}{logoEl}</> : <>{logoEl}{navEl}</>}</div></header>
  }
  const navJustify = cfg.align === 'center' ? 'justify-center' : cfg.align === 'end' ? 'justify-center lg:justify-end' : cfg.align === 'start' ? 'justify-center lg:justify-start' : 'justify-center lg:justify-between'
  return <header className="w-full bg-white border-b border-gray-200" data-nyc-header="20260927">
    {cfg.topBar && <div className="max-w-7xl mx-auto px-4 py-2"><div className={'grid grid-cols-1 gap-3 items-center ' + (cfg.logoLarge ? 'md:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)]' : 'md:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_300px_minmax(0,1fr)]')}>
      <div className="min-w-0 text-[13px] text-gray-700 leading-relaxed">
        <p><a href={`tel:${BUSINESS.phone}`} className="font-bold text-dark hover:underline">{BUSINESS.phone}</a>{' | '}<a href={`sms:${BUSINESS.text}`} className="font-bold text-dark hover:underline">Text Us</a></p>
        <p className="break-all"><a href={BUSINESS.emailHref} className="hover:underline">{BUSINESS.email}</a></p>
        <p>{BUSINESS.address}</p><p className="text-xs text-gray-600 mt-0.5">{BUSINESS.hours}</p><p>Serving {BUSINESS.serviceArea}</p>
      </div>
      <div className={'min-w-0 flex justify-center' + (cfg.grayscale ? ' grayscale' : '')}>{logo}</div>
      <div className="flex flex-col items-center md:items-end gap-2"><div className={'flex items-center gap-3' + (cfg.grayscale ? ' grayscale' : '')}>
        <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="Facebook"><Facebook size={24} fill="currentColor"/></a>
        <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="YouTube"><Youtube size={24}/></a>
        {BUSINESS.yelp && <a href={BUSINESS.yelp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold" aria-label="Yelp" title="Yelp">Y</a>}
      </div><Link href="/order-by-date" className="btn-primary text-sm py-2 px-5 whitespace-nowrap" prefetch={false}>Book Now &#9658;</Link></div>
    </div></div>}
    {cfg.mode === 'logoOnly' && <div className="flex justify-center py-3">{logo}</div>}
    <nav className={cfg.mode === 'blackbar' ? 'bg-black border-t border-black' : 'bg-white border-t border-gray-200'} aria-label="Main navigation"><div className="max-w-7xl mx-auto px-4">{renderNav(cfg.mode === 'blackbar' ? 'text-white' : 'text-dark', navJustify)}</div></nav>
    <HeaderSearch/>
  </header>
}
