export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
// Use the exact same SC price, inclusions and revision-aware images as the
// public homepage and Weddings page. No NY offers or database mutations.
export async function GET() {
  try {
    return NextResponse.json(await getSyncedWeddingPackages(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Wedding packages are temporarily unavailable. Please contact our Greenville team.' }, { status: 503 })
  }
}
