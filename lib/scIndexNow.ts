import { prisma } from '@/lib/prisma'
import { SC_LOCAL_PLANNING } from '@/lib/scLocalPlanningResources'
import { SC_SERVICE_AREAS } from '@/lib/scServiceAreas'
import { SC_STATIC_SEARCH_PATHS, isCmsSearchPage, isSearchableSlug, scUrl, SC_SITE_URL } from '@/lib/scSeo'

const INDEXNOW_ENDPOINT='https://api.indexnow.org/indexnow'
export async function currentSearchableScUrls():Promise<string[]>{
  if(process.env.PUBLIC_INDEXABLE!=='true') return []
  const [categories,items,pages]=await Promise.all([
    prisma.category.findMany({where:{displayToCustomer:true},select:{slug:true}}),
    prisma.item.findMany({where:{displayToCustomer:true,category:{displayToCustomer:true}},select:{slug:true}}),
    prisma.websitePage.findMany({where:{isPublished:true},select:{slug:true,content:true,isPublished:true}}),
  ])
  const urls=new Set<string>(); const add=(path:string)=>urls.add(scUrl(path))
  SC_STATIC_SEARCH_PATHS.forEach(add)
  SC_SERVICE_AREAS.filter(area=>area.href!=='/' && (!Object.keys(SC_LOCAL_PLANNING).length || SC_LOCAL_PLANNING[area.slug])).forEach(area=>add(area.href))
  categories.filter(c=>isSearchableSlug(c.slug)&&c.slug!=='weddings').forEach(c=>add('/category/'+encodeURIComponent(c.slug)))
  items.filter(i=>isSearchableSlug(i.slug)).forEach(i=>add('/items/'+encodeURIComponent(i.slug!)))
  pages.filter(isCmsSearchPage).forEach(p=>add('/'+encodeURIComponent(p.slug)))
  return [...urls]
}
export async function submitScIndexNow(urlList:string[]){
  if(process.env.PUBLIC_INDEXABLE!=='true') return {submitted:0,status:204,ok:true,body:''}
  const key=process.env.INDEXNOW_KEY||''
  if(!key) return {submitted:0,status:204,ok:true,body:''}
  const host=new URL(SC_SITE_URL).hostname
  const unique=[...new Set(urlList)].filter(url=>url.startsWith(SC_SITE_URL+'/')).slice(0,10000)
  if(!unique.length)return{submitted:0,status:204,ok:true,body:''}
  const response=await fetch(INDEXNOW_ENDPOINT,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation:SC_SITE_URL+'/'+key+'.txt',urlList:unique}),signal:AbortSignal.timeout(15000)})
  const body=await response.text().catch(()=> '')
  return{submitted:unique.length,status:response.status,ok:response.ok,body:body.slice(0,500)}
}
