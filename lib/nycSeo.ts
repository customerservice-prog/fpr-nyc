import type { Metadata } from 'next'

export const NYC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fpr-nyc-production.up.railway.app'
export const NYC_BUSINESS_ID = NYC_SITE_URL + '/#business'
export const NYC_SEARCH_REVISION = '2026-09-22-nyc-search-v1'
export const NYC_STATIC_SEARCH_PATHS = ['/', '/about_us', '/category', '/weddings', '/graduation-rentals', '/contact_us', '/employment', '/frequently_asked_questions', '/gallery', '/order-by-date', '/service-area', '/event-planning', '/event-planning/wedding-coordination', '/event-planning/corporate-events', '/event-planning/private-parties', '/event-planning/festivals-fundraisers', '/design-your-event', '/popular-rentals', '/wedding-vendors']
export const NYC_NON_SEARCH_PATHS = ['/items','/wedding-packages','/category/weddings','/pay-now','/unsubscribe','/admin','/driver','/checkout','/pay','/contract','/schedule','/api','/_next','/robots.txt','/sitemap.xml']

export function isSearchableSlug(value:unknown):value is string {
  return typeof value==='string' && value.length>0 && value===value.trim() && !['null','undefined','.','..'].includes(value.toLowerCase()) && !/[\\/?#\u0000-\u0020\u007f]/.test(value)
}

export function nycUrl(path:string):string {
  if(!path.startsWith('/')||path.startsWith('//')||/[\\?#]/.test(path))throw new Error('Expected a local canonical path')
  return NYC_SITE_URL+(path==='/'?'/':path.replace(/\/+$/,''))
}

export function nycMetaText(value:string,max=160):string {
  const text=value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
  if(text.length<=max)return text
  const cut=text.slice(0,max-1)
  return cut.slice(0,Math.max(cut.lastIndexOf(' '),max-25))+'…'
}

export function nycPageMetadata(path:string,title:string,description:string,index=true):Metadata {
  const url=nycUrl(path)
  const publicIndexable = process.env.PUBLIC_INDEXABLE === 'true'
  return {title:title.replace(/\s*\|\s*Friendly Party Rental(?: NYC)?\s*$/i,''),description:nycMetaText(description),alternates:{canonical:url},robots:{index: publicIndexable ? index : false, follow: publicIndexable ? true : false},
    openGraph:{title,description:nycMetaText(description),url,siteName:'Friendly Party Rental NYC',locale:'en_US',type:'website',images:[{url:NYC_SITE_URL+'/images/logo.png',alt:'Friendly Party Rental NYC'}]},
    twitter:{card:'summary_large_image',title,description:nycMetaText(description),images:[NYC_SITE_URL+'/images/logo.png']}}
}

export function nycBreadcrumbs(parts:Array<{name:string;path:string}>){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:parts.map((part,index)=>({'@type':'ListItem',position:index+1,name:part.name,item:nycUrl(part.path)}))}
}

export function isCmsSearchPage(page:{slug:string;content:string|null;isPublished?:boolean}):boolean {
  if(page.isPublished===false||!isSearchableSlug(page.slug))return false
  const path='/'+page.slug
  if(NYC_STATIC_SEARCH_PATHS.includes(path)||NYC_NON_SEARCH_PATHS.some(p=>path===p||path.startsWith(p+'/'))||path.startsWith('/party-rentals-'))return false
  try{const blocks=JSON.parse(page.content||'[]');return Array.isArray(blocks)&&blocks.length>0}catch{return false}
}
