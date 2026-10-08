export const dynamic='force-dynamic'

import { NextRequest,NextResponse } from 'next/server'
import { resolveDriverAccess } from '@/lib/driverAccess'

export async function GET(request:NextRequest){
 const access=await resolveDriverAccess(request)
 if(!access)return NextResponse.json({error:'Unauthorized'},{status:401})
 return NextResponse.json({driver:{id:access.driverId,name:access.name},authMode:access.authMode,isAdmin:access.isAdmin})
}
