import type {MetadataRoute} from 'next'
import {prisma} from '@/lib/prisma'
import {SC_SERVICE_AREAS} from '@/lib/scServiceAreas'
import {SC_LOCAL_PLANNING} from '@/lib/scLocalPlanningResources'
import {SC_STATIC_SEARCH_PATHS,scUrl,isSearchableSlug,isCmsSearchPage,NYC_PUBLIC_INDEXABLE} from '@/lib/scSeo'
export const dynamic='force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!NYC_PUBLIC_INDEXABLE)return []
 const [categories,items,pages]=await Promise.all([
  prisma.category.findMany({where:{displayToCustomer:true},select:{slug:true,updatedAt:true}}),
  prisma.item.findMany({where:{displayToCustomer:true,category:{displayToCustomer:true}},select:{slug:true,updatedAt:true}}),
  prisma.websitePage.findMany({where:{isPublished:true},select:{slug:true,content:true,updatedAt:true}}),
 ])
 const urls=new Map<string,MetadataRoute.Sitemap[number]>()
 const add=(path:string,lastModified?:Date)=>{const url=scUrl(path);urls.set(url,lastModified?{url,lastModified}:{url})}
 SC_STATIC_SEARCH_PATHS.forEach(path=>add(path))
 SC_SERVICE_AREAS.filter(a=>a.href!=='/'&&SC_LOCAL_PLANNING[a.slug]).forEach(a=>add(a.href))
 categories.filter(c=>isSearchableSlug(c.slug)&&c.slug!=='weddings').forEach(c=>add('/category/'+encodeURIComponent(c.slug),c.updatedAt))
 items.filter(i=>isSearchableSlug(i.slug)).forEach(i=>add('/items/'+encodeURIComponent(i.slug!),i.updatedAt))
 pages.filter(isCmsSearchPage).forEach(page=>add('/'+encodeURIComponent(page.slug),page.updatedAt))
 return [...urls.values()]
}
