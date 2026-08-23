import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/item-image/', '/api/category-image/'],      
      disallow: ['/admin', '/api/', '/checkout', '/pay'],
    },
    sitemap: 'https://www.friendlypartyrental.com/sitemap.xml',
  }
}
