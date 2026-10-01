import { NextResponse } from 'next/server'

export const dynamic='force-dynamic'

type Review={id:string;author:string;rating:number;date:string;text:string;source:'google';profilePhoto?:string|null}

function safeManualReviews():Review[]{
 try{
  const raw=process.env.NYC_GOOGLE_REVIEWS_JSON
  if(!raw)return[]
  const rows=JSON.parse(raw)
  if(!Array.isArray(rows))return[]
  return rows.map((row:any,index:number)=>({
    id:String(row.id||'manual-'+index).slice(0,120),
    author:String(row.author||row.name||'Google customer').slice(0,120),
    rating:Number(row.rating),
    date:String(row.date||'').slice(0,40),
    text:String(row.text||'').slice(0,1200),
    source:'google' as const,
    profilePhoto:typeof row.profilePhoto==='string'?row.profilePhoto:null,
  })).filter(row=>row.rating===5&&row.text)
 }catch{return[]}
}

export async function GET(){
 const manual=safeManualReviews()
 if(manual.length)return NextResponse.json({reviews:manual.slice(0,8),source:'configured',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=3600'}})

 const placeId=String(process.env.NYC_GOOGLE_PLACE_ID||'').trim()
 const key=String(process.env.GOOGLE_PLACES_API_KEY||'').trim()
 if(placeId&&key){
  try{
   const url='https://maps.googleapis.com/maps/api/place/details/json?place_id='+encodeURIComponent(placeId)+'&fields=reviews&reviews_sort=newest&key='+encodeURIComponent(key)
   const response=await fetch(url,{next:{revalidate:900}})
   if(response.ok){
    const body=await response.json()
    const reviews=(Array.isArray(body?.result?.reviews)?body.result.reviews:[]).map((row:any,index:number)=>({
      id:'google-'+String(row.time||index),
      author:String(row.author_name||'Google customer').slice(0,120),
      rating:Number(row.rating),
      date:row.time?new Date(Number(row.time)*1000).toISOString():'',
      text:String(row.text||'').slice(0,1200),
      source:'google' as const,
      profilePhoto:typeof row.profile_photo_url==='string'?row.profile_photo_url:null,
    })).filter((row:Review)=>row.rating===5&&row.text)
    return NextResponse.json({reviews:reviews.slice(0,8),source:'google',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=3600'}})
   }
  }catch{}
 }
 return NextResponse.json({reviews:[],source:'pending',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=3600'}})
}
