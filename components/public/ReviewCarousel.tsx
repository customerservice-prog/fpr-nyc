'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Review={id:string;author:string;rating:number;date:string;text:string;source:string;profilePhoto?:string|null}
const AVATAR_COLORS=['#1A73E8','#D93025','#188038','#F9AB00','#9334E6','#12B5CB','#E8710A']
function avatarColor(name:string){let hash=0;for(let i=0;i<name.length;i++)hash=name.charCodeAt(i)+((hash<<5)-hash);return AVATAR_COLORS[Math.abs(hash)%AVATAR_COLORS.length]}

export default function ReviewCarousel(){
 const [reviews,setReviews]=useState<Review[]>([])
 const [loaded,setLoaded]=useState(false)
 useEffect(()=>{let active=true;fetch('/api/reviews',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(body=>{if(active&&Array.isArray(body?.reviews))setReviews(body.reviews)}).catch(()=>{}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[])

 if(loaded&&!reviews.length){
  return <section className="bg-gray-50 py-12" aria-labelledby="nyc-reviews-heading">
    <div className="mx-auto max-w-5xl px-4 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#C85F00]">New York location</p>
      <h2 id="nyc-reviews-heading" className="mt-2 text-2xl font-bold text-dark">NYC / Downstate customer reviews are building now</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-body">This location is new, so we do not copy Syracuse reviews onto the New York storefront. Verified NYC / Downstate Google reviews will appear here automatically when the New York review profile is connected.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/about_us" className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-dark">About Friendly Party Rental NYC</Link>
        <Link href="/contact_us" className="btn-primary rounded-full px-5 py-3 text-sm font-bold">Contact the NYC Team</Link>
      </div>
    </div>
  </section>
 }
 if(!reviews.length)return <div className="h-1" aria-hidden="true"/>

 return <section className="bg-gray-50 py-12" aria-labelledby="nyc-reviews-heading">
  <div className="max-w-7xl mx-auto px-4">
   <div className="mb-6 text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#C85F00]">Verified NYC / Downstate feedback</p><h2 id="nyc-reviews-heading" className="mt-2 text-2xl font-bold text-dark">What Our New York Customers Say</h2></div>
   <div className="md:hidden flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">{reviews.map(review=><article key={'m-'+review.id} className="flex-shrink-0 w-[85%] snap-start bg-white p-5 rounded-lg shadow border border-primary/30"><div className="flex items-center gap-3 mb-3">{review.profilePhoto?<img src={review.profilePhoto} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover"/>:<div className="flex h-9 w-9 items-center justify-center rounded-full text-white font-semibold" style={{backgroundColor:avatarColor(review.author)}}>{review.author.trim().charAt(0).toUpperCase()}</div>}<div><span className="font-bold text-dark block text-sm">{review.author}</span><span className="text-yellow-500 text-xs">{'⭐'.repeat(review.rating)}</span></div></div><p className="text-body text-sm leading-6">{review.text}</p></article>)}</div>
   <div className="hidden md:grid md:grid-cols-2 gap-6">{reviews.map(review=><article key={review.id} className="bg-white p-6 rounded-lg shadow border border-primary/30"><div className="flex items-center gap-3 mb-2">{review.profilePhoto?<img src={review.profilePhoto} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold" style={{backgroundColor:avatarColor(review.author)}}>{review.author.trim().charAt(0).toUpperCase()}</div>}<div><span className="font-bold text-dark block">{review.author}</span><span className="text-yellow-500 text-sm">{'⭐'.repeat(review.rating)}</span></div></div><p className="text-body text-sm leading-6">{review.text}</p></article>)}</div>
  </div>
 </section>
}
