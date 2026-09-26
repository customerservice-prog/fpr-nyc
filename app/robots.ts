import type {MetadataRoute} from 'next'
import {SC_SITE_URL,NYC_PUBLIC_INDEXABLE} from '@/lib/scSeo'
export default function robots():MetadataRoute.Robots{
 if(!NYC_PUBLIC_INDEXABLE)return {rules:{userAgent:'*',disallow:'/'}}
 return {rules:{userAgent:'*',allow:['/','/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/wedding-art/','/api/shared-gallery/','/api/uploads/'],disallow:['/api/']},sitemap:SC_SITE_URL+'/sitemap.xml'}
}
