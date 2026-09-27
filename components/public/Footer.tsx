import Link from 'next/link'; import { BUSINESS } from '@/lib/utils'
import { Facebook, Youtube } from 'lucide-react'

const LOGO_URL = '/brand/friendly-party-rental-nyc-logo-v7.png'

export default function Footer({ footerStyle = 'dark' }: { footerStyle?: string }) {
  if (footerStyle === 'none') {
    return null
  }

  if (footerStyle === 'light-center') {
    return (
      <footer className="bg-gray-100 text-gray-700 pt-8 pb-24 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <img src={LOGO_URL} alt={BUSINESS.name} width={140} height={70} className="mx-auto" />
          <p className="font-bold text-base">{BUSINESS.name}</p>
          <p>{BUSINESS.address}</p>
          <p className="break-words">{BUSINESS.phone} | <a href={BUSINESS.emailHref} className="underline break-all">{BUSINESS.email}</a></p>
          <p className="text-gray-500 text-sm pt-2">
            &copy; {new Date().getFullYear()} {BUSINESS.legalName} All rights reserved.
          </p>
        </div>
      </footer>
    )
  }

  if (footerStyle === 'light-links') {
    return (
      <footer className="bg-gray-100 text-gray-700 pt-8 pb-24 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm space-y-2">
          <img src={LOGO_URL} alt={BUSINESS.name} width={120} height={60} className="mx-auto mb-1" />
          <p className="font-bold text-base">{BUSINESS.name}</p>
          <p>{BUSINESS.address}</p>
          <p className="break-words">{BUSINESS.phone} | <a href={BUSINESS.emailHref} className="underline break-all">{BUSINESS.email}</a></p>
          <p>Serving {BUSINESS.serviceArea}</p>
          <div className="flex items-center justify-center gap-4 pt-1">
            <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="Facebook">
              <Facebook size={22} fill="currentColor" />
            </a>
            <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="YouTube">
              <Youtube size={22} />
            </a>
            {BUSINESS.yelp && <a href={BUSINESS.yelp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold" aria-label="Yelp" title="Yelp">
              Y
            </a>}
          </div><nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 border-t border-gray-200 mt-4"><Link href="/category/tent-rentals" className="underline" prefetch={false}>Tent Rentals</Link> <Link href="/category/table-chair-rentals" className="underline" prefetch={false}>Table & Chair Rentals</Link> <Link href="/weddings" className="underline" prefetch={false}>Wedding Rentals</Link> <Link href="/wedding-vendors" className="underline" prefetch={false}>Wedding Vendors</Link> <Link href="/graduation-rentals" className="underline" prefetch={false}>Graduation Party Rentals</Link> <Link href="/chiavari-chair-rentals" className="underline" prefetch={false}>Chiavari Chair Rentals</Link> <Link href="/category/dance-floor-stage-rentals" className="underline" prefetch={false}>Dance Floor Rentals</Link> <Link href="/category/bounce-house-rentals" className="underline" prefetch={false}>Bounce Houses & Waterslides</Link> <Link href="/category" className="underline" prefetch={false}>Browse All Rentals</Link> <Link href="/service-area" className="underline" prefetch={false}>New York Delivery Areas</Link></nav>
          <p className="text-gray-500 text-sm pt-2">
            &copy; {new Date().getFullYear()} {BUSINESS.legalName} All rights reserved.
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-[#1a1a1a] text-white pt-8 pb-24 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm space-y-2">
        <img src={LOGO_URL} alt={BUSINESS.name} width={180} height={120} className="mx-auto mb-2" />
        <p className="font-bold text-base">{BUSINESS.name}</p>
        <p>{BUSINESS.address}</p>
        <p className="break-words">{BUSINESS.phone} | <a href={BUSINESS.emailHref} className="underline break-all">{BUSINESS.email}</a></p>
        <p>Serving {BUSINESS.serviceArea}</p>
        <div className="flex items-center justify-center gap-4 pt-1">
          <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="Facebook">
            <Facebook size={22} fill="currentColor" />
          </a>
          <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" aria-label="YouTube">
            <Youtube size={22} />
          </a>
          {BUSINESS.yelp && <a href={BUSINESS.yelp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold" aria-label="Yelp" title="Yelp">
            Y
          </a>}
        </div>
<nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 border-t border-gray-700 mt-4"><Link href="/category/tent-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Tent Rentals</Link> <Link href="/category/table-chair-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Table & Chair Rentals</Link> <Link href="/weddings" className="underline text-gray-300 hover:text-white" prefetch={false}>Wedding Rentals</Link> <Link href="/wedding-vendors" className="underline text-gray-300 hover:text-white" prefetch={false}>Wedding Vendors</Link> <Link href="/graduation-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Graduation Party Rentals</Link> <Link href="/chiavari-chair-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Chiavari Chair Rentals</Link> <Link href="/category/dance-floor-stage-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Dance Floor Rentals</Link> <Link href="/category/bounce-house-rentals" className="underline text-gray-300 hover:text-white" prefetch={false}>Bounce Houses & Waterslides</Link> <Link href="/category" className="underline text-gray-300 hover:text-white" prefetch={false}>Browse All Rentals</Link> <Link href="/service-area" className="underline text-gray-300 hover:text-white" prefetch={false}>New York Delivery Areas</Link></nav>
        <p className="text-gray-400 pt-2">
          &copy; {new Date().getFullYear()} {BUSINESS.legalName} All rights reserved.
        </p>
      </div>
    </footer>
  )
}
