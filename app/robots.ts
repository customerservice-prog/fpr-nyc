import type {MetadataRoute} from 'next'
import {NYC_SITE_URL} from '@/lib/nycSeo'
export default function robots():MetadataRoute.Robots{return {
 rules:{userAgent:'*',allow:['/','/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/wedding-art/','/api/shared-gallery/','/api/uploads/'],disallow:['/api/']},
 // Private URLs send noindex, and may be crawled so that directive can be read.
 // Authentication and access control remain unchanged.
 sitemap:NYC_SITE_URL+'/sitemap.xml',
}}
