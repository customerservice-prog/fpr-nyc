import type { Metadata } from 'next'
export const SC_SITE_URL = 'https://www.friendlypartyrentalsc.com'
export const SC_BUSINESS_ID = SC_SITE_URL + '/#business'
export const SC_SEARCH_REVISION = '2026-09-21-sc-search-v1'
export const SC_STATIC_SEARCH_PATHS = ['/', '/about_us', '/category', '/weddings', '/graduation-rentals', '/contact_us', '/employment', '/frequently_asked_questions', '/gallery', '/order-by-date', '/service-area', '/chiavari-chair-rentals', '/event-planning', '/event-planning/wedding-coordination', '/event-planning/corporate-events', '/event-planning/private-parties', '/event-planning/festivals-fundraisers', '/design-your-event', '/popular-rentals', '/wedding-vendors']
export const SC_NON_SEARCH_PATHS = ['/items','/wedding-packages','/category/weddings','/pay-now','/unsubscribe','/admin','/driver','/checkout','/pay','/contract','/schedule','/api','/_next','/robots.txt','/sitemap.xml']
export function isSearchableSlug(value:unknown):value is string {
 return typeof value==='string' && value.length>0 && value===value.trim() && !['null','undefined','.','..'].includes(value.toLowerCase()) && !/[\\/?#\u0000-\u0020\u007f]/.test(value)
}
export function scUrl(path:string):string {
 if(!path.startsWith('/')||path.startsWith('//')||/[\\?#]/.test(path))throw new Error('Expected a local canonical path')
 return SC_SITE_URL+(path==='/'?'/':path.replace(/\/+$/,''))
}
export function scMetaText(value:string,max=160):string {
 const text=value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
 if(text.length<=max)return text
 const cut=text.slice(0,max-1)
 return cut.slice(0,Math.max(cut.lastIndexOf(' '),max-25))+'…'
}
export function scPageMetadata(path:string,title:string,description:string,index=true):Metadata {
 const url=scUrl(path)
 return {title:title.replace(/\s*\|\s*Friendly Party Rental(?: Greenville SC)?$/i,''),description:scMetaText(description),alternates:{canonical:url},robots:{index,follow:true},
 openGraph:{title,description:scMetaText(description),url,siteName:'Friendly Party Rental — South Carolina',locale:'en_US',type:'website',images:[{url:SC_SITE_URL+'/images/logo.png',alt:'Friendly Party Rental — South Carolina'}]},
 twitter:{card:'summary_large_image',title,description:scMetaText(description),images:[SC_SITE_URL+'/images/logo.png']}}
}
export function scBreadcrumbs(parts:Array<{name:string;path:string}>){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:parts.map((part,index)=>({'@type':'ListItem',position:index+1,name:part.name,item:scUrl(part.path)}))}}
export function isCmsSearchPage(page:{slug:string;content:string|null;isPublished?:boolean}):boolean {
 if(page.isPublished===false||!isSearchableSlug(page.slug))return false
 const path='/'+page.slug
 if(SC_STATIC_SEARCH_PATHS.includes(path)||SC_NON_SEARCH_PATHS.some(p=>path===p||path.startsWith(p+'/'))||path.startsWith('/party-rentals-'))return false
 try{const blocks=JSON.parse(page.content||'[]');return Array.isArray(blocks)&&blocks.length>0}catch{return false}
}
