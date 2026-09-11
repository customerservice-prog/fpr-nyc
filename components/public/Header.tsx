'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Facebook, Youtube, ChevronDown } from 'lucide-react'
import { BUSINESS, NAV_RENTALS } from '@/lib/utils'
import HeaderSearch from './HeaderSearch'

const LOGO_URL = '/images/logo.png'

const defaultNavLinks = [
  { name: 'Home', href: '/' },
  { name: 'Weddings', href: '/weddings' },
  { name: 'Rentals', href: '/category', hasDropdown: true },
  { name: 'FAQs', href: '/frequently_asked_questions' },
  { name: 'About Us', href: '/about_us' },
  { name: 'Contact Us', href: '/contact_us' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Employment', href: '/employment' },
  { name: 'Service Area', href: '/service-area' },
]

interface NavLinkItem {
  label: string
  url: string
}

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

// Full ERS-parity header layout styles
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
  const [rentalsOpen, setRentalsOpen] = useState(false)
  const navLinks = navItems && navItems.length > 0
    ? navItems.map((item) => ({ name: item.label, href: item.url, hasDropdown: item.url === '/category' }))
    : defaultNavLinks

  const cfg = HEADER_CONFIG[headerStyle] || HEADER_CONFIG[1]

  const dropdown = (
    <div className="absolute top-full left-0 z-50 bg-white border shadow-lg rounded min-w-[280px] py-2 max-h-96 overflow-y-auto text-dark">
      {NAV_RENTALS.map((item, idx) =>
        'separator' in item ? (
          <hr key={idx} className="my-1 border-gray-200" />
        ) : (
          <Link key={idx} href={item.href} className="block px-4 py-2 text-sm text-dark hover:bg-gray-100" prefetch={false}>
            {item.name}
          </Link>
        )
      )}
    </div>
  )

  function renderNav(textCls: string, justifyCls: string) {
    return (
      <ul className={"flex flex-wrap items-center gap-x-1 lg:gap-x-0 py-2 " + justifyCls}>
        {navLinks.map((link) => (
          <li key={link.name} className="relative">
            {link.hasDropdown ? (
              <button
                onClick={() => setRentalsOpen(!rentalsOpen)}
                className={"flex items-center gap-0.5 px-2 lg:px-3 py-2 font-medium text-sm whitespace-nowrap hover:opacity-80 " + textCls}
              >
                {link.name}
                <ChevronDown size={14} />
              </button>
            ) : (
              <Link
                href={link.href}
                prefetch={false}
                className={"px-2 lg:px-3 py-2 font-medium text-sm block whitespace-nowrap hover:opacity-80 " + textCls}
              >
                {link.name}
              </Link>
            )}
            {link.hasDropdown && rentalsOpen && (<><div className="fixed inset-0 z-40" onClick={() => setRentalsOpen(false)} />{dropdown}</>)}
          </li>
        ))}
      </ul>
    )
  }

  const logo = (
    <Link href="/" prefetch={false}>
      <Image
        src={LOGO_URL}
        alt="Friendly Party Rental"
        width={cfg.logoLarge ? 340 : 280}
        height={cfg.logoLarge ? 227 : 187}
        className={cfg.grayscale ? 'grayscale' : ''}
      />
    </Link>
  )

  // Cover-background styles: hero-style band, centered logo above centered nav
  if (cfg.mode === 'cover') {
    const fgClass = cfg.coverFg === 'black' ? 'text-dark' : 'text-white'
    return (
      <header className="w-full bg-gradient-to-r from-secondary via-primary to-secondary">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center gap-3">
          <Link href="/" prefetch={false}>
            <Image src={LOGO_URL} alt="Friendly Party Rental" width={220} height={147} />
          </Link>
          {renderNav(fgClass, 'justify-center')}
        </div>
      </header>
    )
  }

  // Inline styles: logo and nav share a single colored bar, logo on left or right
  if (cfg.mode === 'inline') {
    const textCls = cfg.textColor === 'black' ? 'text-dark' : 'text-white'
    const logoEl = (
      <Link href="/" prefetch={false}>
        <Image src={LOGO_URL} alt="Friendly Party Rental" width={160} height={107} />
      </Link>
    )
    const navEl = renderNav(textCls, 'justify-start lg:justify-end')
    return (
      <header className="w-full bg-gradient-to-r from-secondary to-primary">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-4">
          {cfg.logoSide === 'right' ? (
            <>
              {navEl}
              {logoEl}
            </>
          ) : (
            <>
              {logoEl}
              {navEl}
            </>
          )}
        </div>
      </header>
    )
  }

  const navJustify =
    cfg.align === 'center' ? 'justify-center' :
    cfg.align === 'end' ? 'justify-center lg:justify-end' :
    cfg.align === 'start' ? 'justify-center lg:justify-start' :
    'justify-center lg:justify-between'

  return (
    <header className={"w-full bg-white border-b border-gray-200"}>
      {/* 3-column header row */}
      {cfg.topBar && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* LEFT column */}
            <div className="text-sm text-gray-700 leading-relaxed">
              <p>
                <a href={`tel:${BUSINESS.phone}`} className="font-bold text-dark hover:underline">
                  {BUSINESS.phone}
                </a>
                {' | '}
                <a href={`sms:${BUSINESS.text}`} className="font-bold text-dark hover:underline">
                  Text Us
                </a>
              </p>
              <p>
                <a href={`mailto:${BUSINESS.email}`} className="hover:underline">
                  {BUSINESS.email}
                </a>
              </p>
              <p>{BUSINESS.address}</p><p className="text-xs text-gray-600 mt-0.5">Mon–Sat: 9am–6pm</p>
              <p>Serving {BUSINESS.serviceArea}</p>
            </div>

            {/* CENTER column — logo */}
            <div className={"flex justify-center" + (cfg.grayscale ? ' grayscale' : '')}>{logo}</div>

            {/* RIGHT column — social + book now */}
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className={"flex items-center gap-3" + (cfg.grayscale ? ' grayscale' : '')}>
                <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="Facebook">
                  <Facebook size={24} fill="currentColor" />
                </a>
                <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="YouTube">
                  <Youtube size={24} />
                </a>
                <a href={BUSINESS.yelp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold" aria-label="Yelp" title="Yelp">
              Y
            </a>
              </div>
              <Link href="/order-by-date" className="btn-primary text-sm py-2 px-5 whitespace-nowrap" prefetch={false}>
                Book Now &#9658;
              </Link>
            </div>
          </div>
        </div>
      )}

      {cfg.mode === 'logoOnly' && (
        <div className="flex justify-center py-3">{logo}</div>
      )}

      {/* Nav bar */}
      <nav className={cfg.mode === 'blackbar' ? 'bg-black border-t border-black' : 'bg-white border-t border-gray-200'}>
        <div className="max-w-7xl mx-auto px-4">
          {renderNav(cfg.mode === 'blackbar' ? 'text-white' : 'text-dark', navJustify)}
        </div>
      </nav>
      {/* Item search bar */}
      <HeaderSearch />
    </header>
  )
}
