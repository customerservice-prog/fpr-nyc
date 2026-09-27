import Link from 'next/link'
import {formatCurrency} from '@/lib/utils'
import {isSearchableSlug} from '@/lib/nycSeo'

interface CatalogItem {id:string;slug?:string|null;name:string;cost:number}
/** Useful, public inventory while the interactive category streams or JS is unavailable.
 * This is the same database-backed catalog, not bot-only or keyword-stuffed content.
 * No availability claims or order writes are made by this fallback.
 */
export default function CategoryCatalogFallback({name,items}:{name:string;items:CatalogItem[]}) {
  return <section data-catalog-fallback="sc-search-v2" className="max-w-7xl mx-auto px-4 py-8">
    <h1 className="text-2xl font-bold text-dark mb-3">{name}</h1>
    <p className="text-sm text-body mb-6">Browse the Riverdale rental catalog. Open an item for details and check your event date for availability. Delivery and tax are calculated during checkout.</p>
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.filter(item=>isSearchableSlug(item.slug)).map(item=><li key={item.id} className="rounded-lg border bg-white p-4">
        <Link href={'/items/'+encodeURIComponent(item.slug!)} prefetch={false} className="font-semibold text-dark hover:underline">{item.name}</Link>
        <p className="mt-2 text-secondary font-bold">{formatCurrency(item.cost)}<span className="text-xs font-normal text-body"> / day</span></p>
      </li>)}
    </ul>
    <p className="mt-6 text-sm text-body">The date selector and cart controls load when JavaScript is available. You can also <Link href="/contact_us" className="underline">contact the Riverdale team</Link> for help.</p>
  </section>
}
