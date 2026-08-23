export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Warehouse location: 330 Costello Pkwy, Minoa, NY 13116
const WAREHOUSE_ZIP = '13116'
const WAREHOUSE_LAT = 43.0772
const WAREHOUSE_LON = -76.0098

const MAX_SERVICE_DISTANCE_MILES = 100

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function getZipCoords(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
    if (!res.ok) return null
    const data = await res.json()
    const place = data?.places?.[0]
    if (!place) return null
    return { lat: parseFloat(place.latitude), lon: parseFloat(place.longitude) }
  } catch {
    return null
  }
}

function calculateFeeForDistance(distance: number) {
  // Distances beyond MAX_SERVICE_DISTANCE_MILES are still quoted (matching ERS, which allows
  // booking with a warning even at 150+ miles). The admin UI shows an "outside service range"
  // warning banner when deliveryDistance exceeds this threshold instead of blocking the order.
  if (distance <= 5) return { fee: 29.99, error: null }
  if (distance <= 15) return { fee: 49.99, error: null }
  const extraMiles = distance - 15
  const fee = 89.99 + extraMiles * 4
  return { fee: Math.round(fee * 100) / 100, error: null }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const zip = (searchParams.get('zip') || '').trim()

  if (!zip || zip.length < 5) {
    return NextResponse.json({ error: 'Valid zip code required' }, { status: 400 })
  }

  if (zip === WAREHOUSE_ZIP) {
    return NextResponse.json({ fee: 0, distance: 0 })
  }

  const customerCoords = await getZipCoords(zip)
  if (!customerCoords) {
    return NextResponse.json({ error: 'Could not locate that zip code. Please double check it or contact us.' }, { status: 400 })
  }

  const distance = haversineMiles(WAREHOUSE_LAT, WAREHOUSE_LON, customerCoords.lat, customerCoords.lon)
  const { fee, error } = calculateFeeForDistance(distance)

  if (error) {
    return NextResponse.json({ error, distance: Math.round(distance * 10) / 10 }, { status: 200 })
  }

  return NextResponse.json({ fee, distance: Math.round(distance * 10) / 10 })
}
