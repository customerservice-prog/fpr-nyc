import type { MetadataRoute } from 'next'
import {prisma} from '@/lib/prisma'
import {NYC_SERVICE_AREAS} from '@/lib/nycServiceAreas'
import {NYC_LOCAL_PLANNING} from '@/lib/nycLocalPlanningResources'
import {NYC_STATIC_SEARCH_PATHS,nycUrl,isSearchableSlug,isCmsSearchPage,nycIndexingEnabled} from '@/lib/nycSeo'
import { nycItemPath } from '@/lib/nycItemPath'
import { planningServices } from '@/lib/eventPlanning'
export const dynamic='force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!nycIndexingEnabled()) return []
 // Do not silently publish a truncated sitemap when the database is unavailable.
 const [categories,items,pages]=await Promise.all([
  prisma.category.findMany({where:{displayToCustomer:true},select:{slug:true,updatedAt:true}}),
  prisma.item.findMany({where:{displayToCustomer:true,category:{displayToCustomer:true}},select:{slug:true,updatedAt:true}}),
  prisma.websitePage.findMany({where:{isPublished:true},select:{slug:true,content:true,updatedAt:true}}),
 ])
 const urls=new Map<string,MetadataRoute.Sitemap[number]>()
 const add=(path:string,lastModified?:Date)=>{const url=nycUrl(path);urls.set(url,lastModified?{url,lastModified}:{url})}
 // Request time is not a content modification date. Static lastmod is omitted.
 NYC_STATIC_SEARCH_PATHS.forEach(path=>add(path))
 planningServices.forEach(service=>add('/event-planning/'+encodeURIComponent(service.slug)))
 NYC_SERVICE_AREAS.filter(a=>a.href!=='/'&&NYC_LOCAL_PLANNING[a.slug]).forEach(a=>add(a.href))
 categories.filter(c=>isSearchableSlug(c.slug)&&c.slug!=='weddings').forEach(c=>add('/category/'+encodeURIComponent(c.slug),c.updatedAt))
 items.filter(i=>isSearchableSlug(i.slug)).forEach(i=>add(nycItemPath(i.slug!),i.updatedAt))
 pages.filter(isCmsSearchPage).forEach(page=>add('/'+encodeURIComponent(page.slug),page.updatedAt))
 return [...urls.values()]
}
