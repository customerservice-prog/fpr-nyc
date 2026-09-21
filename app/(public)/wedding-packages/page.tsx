import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'

export const dynamic = 'force-dynamic'

export default async function WeddingPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>
}) {
  const packagesRaw = await getSyncedWeddingPackages()
  const packages = packagesRaw.map((p) => ({
    ...p,
    items: Array.isArray(p.items) ? (p.items as string[]) : [],
    image: p.image || undefined,
  }))
  const { package: packageId } = await searchParams
  const pkg = packages.find((p) => p.id === packageId) || packages[0]

  if (!pkg) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-body">
        No wedding packages are available right now. Please contact us for a custom quote.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/weddings" className="text-secondary text-sm hover:underline mb-4 block">
        &larr; Back to Wedding Packages
      </Link>

      <div className="bg-white rounded-lg shadow-lg border-2 border-primary overflow-hidden">
        {pkg.image && (
          <img src={pkg.image} alt={`${pkg.name}: illustrative event setting; refer to the inclusions list`} className="w-full h-auto max-h-[520px] object-cover bg-gray-50" />
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {pkg.popular && (
              <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded">MOST POPULAR</span>
            )}
            {'signature' in pkg && pkg.signature && (
              <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded">SIGNATURE</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-dark mb-2">{pkg.name}</h1>
          <p className="text-4xl font-bold text-secondary mb-2">{formatCurrency(pkg.price)}</p>
          <p className="text-body mb-5">Up to {pkg.guests} guests</p>

          {pkg.description && (
            <p className="text-body leading-7 mb-7 whitespace-pre-line">{pkg.description}</p>
          )}

          <h2 className="font-bold text-dark mb-4">Greenville Package Includes:</h2>
          <ul className="space-y-3 mb-8">
            {pkg.items.map((item: string) => (
              <li key={item} className="flex items-start gap-2 text-body">
                <span className="text-primary font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-body text-sm mb-6">
            Standard delivery, setup, and breakdown are included in the package price. A travel fee may apply based on distance from Greenville. Contact us to customize quantities, colors, lighting, linens, or other details for your wedding.
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact_us" className="btn-primary text-center">Request Quote</Link>
            <Link href="/order-by-date" className="btn-accent text-center">Check My Date</Link>
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
              prefetch={false}
              className="border border-primary/30 rounded-lg overflow-hidden hover:bg-primary/10 transition-colors flex items-center gap-3"
            >
              {p.image && (
                <img src={p.image} alt={p.name} className="w-24 h-24 object-cover flex-shrink-0" />
              )}
              <div className="p-4 min-w-0">
                <h3 className="font-bold text-dark">{p.name}</h3>
                <p className="text-secondary font-bold">{formatCurrency(p.price)}</p>
                <p className="text-xs text-body mt-1">Up to {p.guests} guests</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
