'use client'
import Link from 'next/link'
import CategoryCard from './CategoryCard'
import { NYC_CATEGORY_IMAGES } from '@/lib/nycCategoryImages'
import { NY_CATEGORY_ORDER, NY_MOBILE_CATEGORY_NAMES } from '@/lib/nyHomeMedia'
interface Category {slug:string;name:string;href:string;image?:string}
interface Props {categories:Category[];mobile?:boolean;categoryEditMode?:{selectedSlug:string|null;onSelect:(slug:string)=>void}}
export default function HomeCategoryGrid({categories,mobile=false,categoryEditMode}:Props){
 const order=new Map(NY_CATEGORY_ORDER.map((slug,index)=>[slug,index]))
 const sorted=[...categories].sort((a,b)=>(order.get(a.slug)??999)-(order.get(b.slug)??999))
 const cards=sorted.map(category=><div key={category.slug} data-home-category={category.slug} className={mobile?'home-category':undefined} onClickCapture={categoryEditMode?event=>{event.preventDefault();event.stopPropagation();categoryEditMode.onSelect(category.slug)}:undefined}>
  <CategoryCard name={mobile?(NY_MOBILE_CATEGORY_NAMES[category.slug]||category.name):category.name} href={category.href} image={category.image?.startsWith('/api/category-image/')?category.image:NYC_CATEGORY_IMAGES[category.slug]||category.image} displayStyle="boxed"/>
 </div>)
 if(mobile)return <section data-home-section="categories" className="home-wrap py-9">
  <div className="text-center"><p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#C85F00]">Everything for your event</p><h2 className="home-heading">Shop by Category</h2><p className="mt-2 text-sm text-gray-500">Browse all rental categories or start with your event date.</p></div>
  <div className="home-categories mt-5">{cards}</div>
  <div className="mt-5"><Link href="/category" prefetch={false} className="home-button home-button-outline">VIEW ALL RENTALS</Link></div>
 </section>
 return <section data-home-section="categories" className="mx-auto max-w-6xl px-4 py-12">
  <h2 className="mb-7 text-center text-2xl font-bold text-dark">Browse Our Rentals</h2>
  <div className="grid grid-cols-3 gap-4">{cards}</div>
 </section>
}
