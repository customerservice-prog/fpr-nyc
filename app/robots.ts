import type {MetadataRoute} from 'next'
import {NYC_SITE_URL} from '@/lib/nycSeo'
export default function robots():MetadataRoute.Robots{
 const indexable=process.env.PUBLIC_INDEXABLE==='true'
 if(!indexable)return{rules:{userAgent:'*',disallow:'/'}}
 return{rules:{userAgent:'*',allow:['/','/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/uploads/'],disallow:['/api/']},sitemap:NYC_SITE_URL+'/sitemap.xml'}
}
