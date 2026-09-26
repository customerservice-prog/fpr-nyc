import {categorySearchName} from '@/lib/nycSearchReadiness'
import {cache} from 'react'
import {prisma} from '@/lib/prisma'
import {safeJsonLd} from '@/lib/jsonLd'
import {categoryDescriptionForSc} from '@/lib/nycPublicCopy'
import {scPageMetadata,scBreadcrumbs,scUrl,SC_BUSINESS_ID} from '@/lib/nycSeo'
import {getCategoryPlanningContent} from '@/lib/categoryPlanningContent'
const getCategory=cache((slug:string)=>prisma.category.findUnique({where:{slug}}))
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const category=await getCategory((await params).slug)
 if(!category||!category.displayToCustomer)return {title:'Rental category not found',robots:{index:false,follow:true}}
 const name=categorySearchName(category.slug,category.name)
 const guide=getCategoryPlanningContent(category.slug,name)
 return scPageMetadata('/category/'+encodeURIComponent(category.slug),guide.title,guide.description,category.slug!=='weddings')
}
export default async function CategoryLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
 const category=await getCategory((await params).slug)
 if(!category||!category.displayToCustomer)return children
 const path='/category/'+encodeURIComponent(category.slug)
 const guide=getCategoryPlanningContent(category.slug,categorySearchName(category.slug,category.name))
 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:guide.title,description:guide.description,url:scUrl(path)}
 const serviceSchema={'@context':'https://schema.org','@type':'Service','@id':scUrl(path)+'#service',name:guide.title,serviceType:categorySearchName(category.slug,category.name),url:scUrl(path),provider:{'@id':SC_BUSINESS_ID},areaServed:['Greenville','Greer','Simpsonville','Mauldin','Taylors','Easley','Travelers Rest','Fountain Inn'].map(name=>({'@type':'Place',name:name+', SC'}))}
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(serviceSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(scBreadcrumbs([{name:'Home',path:'/'},{name:'Rental Categories',path:'/category'},{name:category.name,path}]))}}/>{children}</>
}
