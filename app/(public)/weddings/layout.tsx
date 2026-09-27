import Link from 'next/link'
import {prisma} from '@/lib/prisma'
import {isSearchableSlug} from '@/lib/nycSeo'

/** Link the complete existing wedding catalog from the indexable wedding hub.
 * Featured cards are intentionally limited; this visible directory covers the rest.
 * Uses public SC records only. No duplicated offer text, price changes or new URLs.
 */
export default async function WeddingsLayout({children}:{children:React.ReactNode}) {
  const items=await prisma.item.findMany({
    where:{displayToCustomer:true,category:{slug:'weddings',displayToCustomer:true}},
    select:{id:true,name:true,slug:true},
    orderBy:{name:'asc'},
  })
  const published=items.filter(item=>isSearchableSlug(item.slug))
  return <>{children}{published.length>0&&<section data-wedding-catalog-links="sc-search-v2" aria-labelledby="wedding-catalog-heading" className="max-w-6xl mx-auto px-4 pb-16">
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
      <h2 id="wedding-catalog-heading" className="text-2xl font-bold text-dark">Wedding rental catalog</h2>
      <p className="mt-3 mb-6 text-sm leading-6 text-body">Explore the individual Riverdale catalog listings, including pieces not shown in the featured collection above. Review each listing and confirm your date and package inclusions with our team.</p>
      <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {published.map(item=><li key={item.id}><Link href={'/items/'+encodeURIComponent(item.slug!)} prefetch={false} className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">{item.name}</Link></li>)}
      </ul>
    </div>
  </section>}</>
}
