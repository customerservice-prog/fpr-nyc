import type {MetadataRoute} from 'next'
import {SC_SITE_URL} from '@/lib/scSeo'
export default function robots():MetadataRoute.Robots{return {
 rules:{userAgent:'*',allow:['/','/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/shared-gallery/','/api/uploads/'],disallow:['/api/']},
 // Private URLs send noindex, and may be crawled so that directive can be read.
 // Authentication and access control remain unchanged.
 sitemap:SC_SITE_URL+'/sitemap.xml',
}}
