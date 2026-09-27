import type {MetadataRoute} from 'next'
import {NYC_SITE_URL,nycIndexingEnabled} from '@/lib/nycSeo'

export default function robots():MetadataRoute.Robots{
  if(!nycIndexingEnabled()){
    return {rules:{userAgent:'*',disallow:'/'}}
  }
  return {
    rules:{
      userAgent:'*',
      allow:['/','/api/item-image/','/api/category-image/','/api/wedding-package-image/','/api/wedding-art/','/api/shared-gallery/','/api/uploads/'],
      disallow:['/api/'],
    },
    sitemap:NYC_SITE_URL+'/sitemap.xml',
  }
}
