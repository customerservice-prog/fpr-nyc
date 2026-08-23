'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

function PackageDetail() {
    const searchParams = useSearchParams()
    const packageId = searchParams.get('package')
    const [packages, setPackages] = useState<any[]>([])
    useEffect(() => {
          fetch('/api/wedding-packages').then((res) => res.json()).then(setPackages).catch(() => setPackages([]))
    }, [])
    const pkg = packages.find((p) => p.id === packageId) || packages[0]
    if (!pkg) {
                  return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>
    }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/weddings" className="text-secondary text-sm hover:underline mb-4 block">
        ← Back to Wedding Packages
      </Link>

      <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden">
        {'image' in pkg && pkg.image && (
          <img src={pkg.image} alt={pkg.name} className="w-full h-auto object-contain bg-gray-50" />
        )}
        <div className="p-8">
        {pkg.popular && (
          <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded mb-4 inline-block">
            MOST POPULAR
          </span>
        )}
        {'signature' in pkg && pkg.signature && (
          <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded mb-4 inline-block">
            SIGNATURE
          </span>
        )}
        <h1 className="text-3xl font-bold text-dark mb-2">{pkg.name}</h1>
        <p className="text-4xl font-bold text-secondary mb-2">{formatCurrency(pkg.price)}</p>
        <p className="text-body mb-6">Up to {pkg.guests} guests</p>

        <h2 className="font-bold text-dark mb-4">Package Includes:</h2>
        <ul className="space-y-3 mb-8">
          {pkg.items.map((item: string) => (
            <li key={item} className="flex items-start gap-2 text-body">
              <span className="text-primary">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className="text-body text-sm mb-6">
          All packages include professional delivery, setup, and breakdown. No hidden fees.
          Contact us to customize this package for your special day.
        </p>

        <div className="flex gap-4">
          <Link href="/contact_us" className="btn-primary">Request Quote</Link>
          <Link href="/order-by-date" className="btn-accent">Book Online</Link>
        </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-dark mb-6">All Wedding Packages</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {packages.map((p) => (
            <Link
              key={p.id}
              href={`/wedding-packages?package=${p.id}`}
              className="border border-primary/30 rounded-lg overflow-hidden hover:bg-primary/10 transition-colors flex items-center gap-3"
            >
              {'image' in p && p.image && (
                <img src={p.image} alt={p.name} className="w-20 h-20 object-cover flex-shrink-0" />
              )}
              <div className="p-4">
                <h3 className="font-bold text-dark">{p.name}</h3>
                <p className="text-secondary font-bold">{formatCurrency(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WeddingPackagesPage() {
  return (
    <Suspense fallback={<p className="text-center py-12">Loading...</p>}>
      <PackageDetail />
    </Suspense>
  )
}
