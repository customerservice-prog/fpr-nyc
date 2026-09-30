import Link from 'next/link'
import { BUSINESS, PUBLIC_CATEGORIES } from '@/lib/utils'

export default function NotFound() {
  return (
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
      <a href="tel:+13158841498" className="btn-primary inline-block">
        Call {BUSINESS.phone}
      </a>
    </div>
  )
}
