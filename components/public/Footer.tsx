import Image from 'next/image'
import Link from 'next/link'; import { BUSINESS } from '@/lib/utils'

const LOGO_URL = '/images/logo.png'

export default function Footer({ footerStyle = 'dark' }: { footerStyle?: string }) {
  if (footerStyle === 'none') {
    return null
  }

  if (footerStyle === 'light-center') {
    return (
      <footer className="bg-gray-100 text-gray-700 pt-8 pb-24 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <Image src={LOGO_URL} alt={BUSINESS.legalName} width={140} height={70} className="mx-auto" />
          <p className="font-bold text-base">{BUSINESS.legalName}</p>
          <p>{BUSINESS.address}</p>
          <p>{BUSINESS.phone} | {BUSINESS.email}</p>
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
          <p className="font-bold text-base">{BUSINESS.legalName}</p>
          <p>{BUSINESS.address}</p>
          <p>{BUSINESS.phone} | {BUSINESS.email}</p>
          <p>Serving {BUSINESS.serviceArea}</p><nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3"><Link href="/category/tent-rentals" className="underline">Tent Rentals</Link> <Link href="/category/table-chair-rentals" className="underline">Table & Chair Rentals</Link> <Link href="/weddings" className="underline">Wedding Rentals</Link> <Link href="/wedding-vendors" className="underline">Wedding Vendors</Link> <Link href="/graduation-rentals" className="underline">Graduation Party Rentals</Link> <Link href="/chiavari-chair-rentals" className="underline">Chiavari Chair Rentals</Link> <Link href="/category/dance-floor-stage-rentals" className="underline">Dance Floor Rentals</Link> <Link href="/category/bounce-house-rentals" className="underline">Bounce Houses & Waterslides</Link> <Link href="/category" className="underline">Browse All Rentals</Link></nav>
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
        <p className="font-bold text-base">{BUSINESS.legalName}</p>
        <p>{BUSINESS.address}</p>
        <p>{BUSINESS.phone} | {BUSINESS.email}</p>
        <p>Serving {BUSINESS.serviceArea}</p>
        <p className="text-gray-400 pt-2">
          &copy; {new Date().getFullYear()} {BUSINESS.legalName} All rights reserved.
        </p>
      </div>
    </footer>
  )
}
