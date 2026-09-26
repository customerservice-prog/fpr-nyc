import Link from 'next/link'
import Header from '@/components/public/Header'
import MobileHeader from '@/components/public/MobileHeader'
import Footer from '@/components/public/Footer'
import MobileBottomNav from '@/components/public/MobileBottomNav'
import { PUBLIC_CATEGORIES } from '@/lib/utils'

export default function NotFound() {
  return (
    <>
      <div className="hidden md:block"><Header navItems={[]} headerStyle={1} /></div>
      <div className="md:hidden"><MobileHeader /></div>
      <main className="min-h-screen pb-20">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-dark mb-3">We Couldn&apos;t Find That Page</h1>
          <p className="text-body mb-8">
            The item or page you were looking for may have been renamed, sold out, or is no
            longer available. Here are some popular rental categories to get you back on track:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10 text-left">
            {PUBLIC_CATEGORIES.filter((c) => c.slug !== 'order-by-date').map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                className="block bg-gray-50 hover:bg-gray-100 border rounded-lg px-4 py-3 text-sm font-medium text-dark"
              >
                {c.name}
              </Link>
            ))}
          </div>
          <p className="text-body mb-6">
            Or <Link href="/items" className="font-semibold underline">browse our full rental catalog</Link>.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/" className="btn-primary inline-block px-6 py-3">
              Back to Home
            </Link>
            <a href="tel:+18646105324" className="btn-outline inline-block px-6 py-3">
              Call (864) 610-5324
            </a>
          </div>
        </div>
      </main>
      <Footer footerStyle="dark" />
      <div className="md:hidden"><MobileBottomNav /></div>
      <div className="md:hidden" style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
    </>
  )
}
