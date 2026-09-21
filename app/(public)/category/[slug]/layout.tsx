import {categorySearchName} from '@/lib/scSearchReadiness'
import {cache} from 'react'
import {prisma} from '@/lib/prisma'
import {safeJsonLd} from '@/lib/jsonLd'
import {categoryDescriptionForSc} from '@/lib/scPublicCopy'
import {scPageMetadata,scBreadcrumbs,scUrl} from '@/lib/scSeo'
const getCategory=cache((slug:string)=>prisma.category.findUnique({where:{slug}}))
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const category=await getCategory((await params).slug)
 if(!category||!category.displayToCustomer)return {title:'Rental category not found',robots:{index:false,follow:true}}
 const name=categorySearchName(category.slug,category.name)
 return scPageMetadata('/category/'+encodeURIComponent(category.slug),`${name} in Greenville, SC`,categoryDescriptionForSc(name,category.description),category.slug!=='weddings')
}
export default async function CategoryLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
 const category=await getCategory((await params).slug)
 if(!category||!category.displayToCustomer)return children
 const path='/category/'+encodeURIComponent(category.slug)
 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:category.name,description:categoryDescriptionForSc(category.name,category.description),url:scUrl(path)}
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(scBreadcrumbs([{name:'Home',path:'/'},{name:'Rental Categories',path:'/category'},{name:category.name,path}]))}}/>{children}</>
}
