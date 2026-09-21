import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { SC_CATEGORY_IMAGES } from '@/lib/scCategoryImages'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params
 const fallback=async()=>{const local=SC_CATEGORY_IMAGES[slug];if(!local)return new NextResponse('Not found',{status:404});return new NextResponse(await readFile(path.join(process.cwd(),'public',local)),{headers:{'Content-Type':local.toLowerCase().endsWith('.png')?'image/png':local.toLowerCase().endsWith('.webp')?'image/webp':'image/jpeg','Cache-Control':'public, max-age=300, stale-while-revalidate=3600'}})}
 try{const category=await prisma.category.findUnique({where:{slug},select:{picture:true}});if(!category?.picture)return fallback();const match=category.picture.match(/^data:(image\/[^;]+);base64,(.+)$/);if(match)return new NextResponse(Buffer.from(match[2],'base64'),{headers:{'Content-Type':match[1],'Cache-Control':'public, max-age=300'}});const upstream=await fetch(new URL(category.picture,request.url),{signal:AbortSignal.timeout(8000)});if(!upstream.ok||!upstream.headers.get('content-type')?.startsWith('image/'))return fallback();return new NextResponse(Buffer.from(await upstream.arrayBuffer()),{headers:{'Content-Type':upstream.headers.get('content-type')||'image/jpeg','Cache-Control':'public, max-age=300'}})}catch{return fallback()}
}
