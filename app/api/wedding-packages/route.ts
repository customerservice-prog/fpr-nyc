export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
// Same package data as the public homepage and Weddings page: inclusions,
// revision-aware images and only approved NYC prices. No database mutations.
export async function GET() {
  try {
    return NextResponse.json(await getSyncedWeddingPackages(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Wedding packages are temporarily unavailable. Please call 315-884-1498.' }, { status: 503 })
  }
}
